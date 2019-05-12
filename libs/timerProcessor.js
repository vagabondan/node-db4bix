'use strict';
const Configurator = require('./configurator');
const DB = require('./dbs');
const Storage = require('./storage');
const hash = require('object-hash');
const assert = require('assert');

const debug = require('debug')("db4bix:mainProcessor");
debug('Init');


class TimerProcessor{

  constructor(opts){
    const timers = [];
    const configurator = {};
    Object.assign(this,{
      timers,
      configurator,
      storage: undefined,
      dbConnectors: []
    });
  }

  static createDBConnectorInstance({conf}){
    const connector = new DB({conf});
    connector.init();
    return connector;
  }

  static createDBConnector({conf}){
    return {
      conf,
      instance: TimerProcessor.createDBConnectorInstance({conf})
    };
  }

  getDBConnector({dbName}) {
    return this.dbConnectors.find(c => c.conf.name === dbName);
  }

  registerDB({conf, dbConnectorInstance}){
    assert.ok(conf,"conf parameter has to be non empty at registerDB!");

    let connectorIndex = this.dbConnectors.findIndex(c => c.conf.name === conf.name);
    if(connectorIndex >= 0){        // found connector
      if(dbConnectorInstance){      // if instance not null in arguments
          this.dbConnectors[connectorIndex] = {conf, instance: dbConnectorInstance};
      }else{                        // no instance in arguments
        if(hash(conf) !== hash(this.dbConnectors[connectorIndex].conf)){    // registered connector's config differs from current config from arguments
          this.dbConnectors[connectorIndex] = TimerProcessor.createDBConnector({conf});
        }
      }
    }else{                     // not found connector
      dbConnectorInstance ?
        this.dbConnectors.push({conf, instance: dbConnectorInstance}):
        this.dbConnectors.push(TimerProcessor.createDBConnector({conf}));
    }
    return this.dbConnectors.find(c => c.conf.name === conf.name);
  }

  deleteDBs({dbs}){
    //TODO TBD!
    console.error("Delete DB procedure is not implemented yet!");
  }

  updateTargets({dbs}){
    //delete
    const newDBNames = dbs.map(db => db.name);
    const dbToDelete = this.dbConnectors.filter(c => newDBNames.includes(c.conf.name));
    this.deleteDBs({dbs: dbToDelete});

    // add/update
    dbs.forEach(db => {
      this.registerDB({conf: db});
    });
  }

  prepareToMonitor({conf}){
    this.updateTargets({dbs: conf.dbs});
    for (const zabbix of conf.zabbixes){
      for(const {dbName, itemid, hostid, timers} of zabbix.params){
        //assert.ok(fileConfig.DB.hasOwnProperty(dbName),"No section [DB."+dbName+"] found in file config, but it appears in section [Zabbix."+serverName+"].dbs: "+JSON.stringify(zabbix.dbs));
        Object.keys(timers).forEach(period => {
          const query = this.query.bind(this, {zabbixName: zabbix.name, dbName, itemid, hostid, period});
          this.createTimer({period, query});
        });
      }
    }
  }

  /**
   *
   * @param timer
   * @param id
   * @returns id
   */
  registerTimer(id, timer) {
    // First, clean timers array: get rid of nulls, undefined, holes in timers array
    // because we push only NON null objects!
    this.timers = this.timers.filter(t => t != null);

    if(Number.isNaN(parseInt(id))){ // no id
      // use max id strategy
      id = this.timers.reduce((maxId, t) => t.id < maxId ? maxId : t.id + 1, 0);
      this.timers.push({id, timer});
    }else{ // id was given
      const timerIndex = this.timers.findIndex(t => id === t.id);
      timerIndex > -1 ?
        this.timers[timerIndex] = {id, timer} :       // found timer with given id
        this.timers.push({id, timer});  // no timer found, create new one with given id
    }
    return id;
  }

  /**
   *
   * @param period in seconds
   * @param query
   * @param firstDelay in seconds
   * @returns {id} - timer id in internal timer array
   */
  createTimer({period, query, firstDelay}) {
    const checkPeriod = (p) => {
      p = ~~(p * 1000); //  convert periods into milliseconds and integers
      p = p > p ?       //  if Infinity
        60000 :         //    then 60 sec
        p < 5000 ?      //  else if < 5 sec
          5000 : p ;    //    then 5 sec else p
      return p;
    };
    period = checkPeriod(period);
    firstDelay = checkPeriod(firstDelay);
    const id = this.registerTimer();
    const registerTimer = this.registerTimer.bind(this, id);          // get id and bind id as first argument
    registerTimer(                                                            // set timer with bound id
      setTimeout(
        async function setQuery(){
          await query();
          registerTimer(setTimeout(setQuery, period));                   // reset timer with bound id
        },
        firstDelay || Math.random()*30*1000                                   // first run is randomly shifted up to 30 sec by default
      )
    );
    return id;
  }

  async sendData(){
    const dataArray = await this.storage.popAll();
    const groupedBySender = dataArray.reduce((acc, d) =>{
      if(acc[d.sender.name]){
        acc[d.sender.name].data = acc[d.sender.name].data.concat(d.data);
      }else{
        acc[d.sender.name] = {};
        acc[d.sender.name].data = [].concat(d.data);
        acc[d.sender.name].sender = d.sender;
      }
      return acc;
    },{});
    Object.keys(groupedBySender).forEach(name => {
      groupedBySender[name].sender.sendHistoryData(groupedBySender[name].data)
    });
    dataArray.length = 0;
  }

  prepareToSendData({period}){
    const query = this.sendData.bind(this);
    return this.createTimer({period, query, firstDelay: period});
  }

  async init(){
    try{
      this.storage = new Storage();
      this.configurator = new Configurator();
      const conf = await this.configurator.updateConfiguration();
      this.cancelAllTimers();
      this.prepareToMonitor({conf});
      this.prepareToSendData({period: conf.zabbixes.reduce((acc, v) => Math.min(acc, v.sendDataPeriod), Infinity)});
      debug(conf);
    }catch(e){
      console.error("Error getting config from Zabbix",e);
    }
  }

  async updatePeriodically(){
    // TODO TBD!
    this.storage = this.storage || new Storage();
    const configurator = new Configurator();
    const confNew = await configurator.updateConfiguration();
    const conf = this.configurator && this.configurator.getMonitorConfig();
    this.prepareToMonitor({conf, confNew});

    if(hash(confNew) !== hash(conf)){
      const diff = {};

      /************************************************************/
      // Zabbix Servers
      // Update/delete
      diff.zabbixServers = conf.reduce((acc, z) => {
        const zNew = confNew.find(zNew => z.name === zNew.name);
        if(zNew){
          if(hash(z) !== hash(zNew)){ // z => Update
            acc.toUpdate ? acc.toUpdate.push(z) : acc.toUpdate = [].concat(z);
          }
        }else{ // z => delete
          acc.toDelete ? acc.toDelete.push(z) : acc.toDelete = [].concat(z);
        }
        return acc;
      },{});
      // insert
      Object.assign(diff.zabbixServers,{
        toInsert: confNew.filter(zNew => conf.find(z => z.name === zNew.name ))
      });
      /************************************************************/





    }
  }

  createMonitorTimer({period, dbConnector, queries, sender, items}) {
    //const timerId = setInterval(this.query, period*1000, {dbConnector, queries});
    const query = this.query.bind(this, {dbConnector, queries, sender, items});
    const id = this.registerTimer();
    const registerTimer = this.registerTimer.bind(this);
    registerTimer(
      setTimeout(async function setQuery(){
        await query();
        registerTimer(setTimeout(setQuery, period*1000), id);
        },
        Math.random()*30*1000   // first run is randomly shifted up to 30 sec
      ),
      id
    );
  }

  postProcessResults({data, sender}){
    // save data to storage for sending
    debug("data: "+JSON.stringify(data));
    this.storage.push({data, sender});

  }

  static produceKeyValueArray({keys, table}){
    // 1. generate key-value array
    //const keys = q.item.split("|"); // can be key1|key2|key3
    return table.reduce(
      (kvAcc, row) => {
        // for each key in item from right to left
        const obj = {};
        for(let i = keys.length; --i >= 0;){
          const macros = keys[i].match(/%\d+/g) || [];
          const key = macros.reduce((keyAcc, m) => keyAcc.replace(m, row[parseInt(m.substring(1))-1]), keys[i]);  // key resolved
          obj[key] = row[row.length - keys.length + i];
        }
        kvAcc.push(obj);
        return kvAcc;
      }, []
    );
  }

  /**
   *
   * @param query
   * @param table
   * @param items
   * @returns {Array}
   */
  static convertToMonitoringData({query, table, items}){
    const keyOffset = items.fields.findIndex(f => f === "key_");
    const itemidOffset = items.fields.findIndex(f => f === "itemid");
    let data = [];
    if(query.names){  // discovery!
      const names = query.names.split("|").map(name => "{#"+name+"}");  // generate user-macro names
      const keyValueArray = TimerProcessor.produceKeyValueArray({keys: names, table});
      const item = items.data.find(item => item[keyOffset] === query.item);
      item && data.push({
        [item[itemidOffset]]: keyValueArray
      });
    }else{        // ordinary query
      // 1. generate key-value array
      const itemKeys = query.item.split("|"); // can be key1|key2|key3
      const keyValueArray = TimerProcessor.produceKeyValueArray({keys: itemKeys, table});

      // 2. resolve itemid
      data = keyValueArray.reduce((acc, obj)=>{
          acc = Object.keys(obj).reduce((acc1, key)=>{
            const item = items.data.find(item => item[keyOffset] === key);
            item && acc1.push({
              [item[itemidOffset]]: obj[key]
            });
            return acc1;
          }, acc);
          return acc;
        }, []
      );
    }
    return data;
  }

  getQueries({period, zabbixName, itemid}){
    return this.configurator
      .getMonitorConfig()
      .zabbixes.find(z => z.name === zabbixName)
      .params.find(p => p.itemid === itemid)
      .timers[period];
  }

  getItems({zabbixName, hostid}){
    const items = this.configurator
      .getMonitorConfig()
      .zabbixes.find(z => z.name === zabbixName)
      .zabbixConfig.items;
    const itemsOffsets = Configurator.getFieldOffsetMap({source: items});
    return {
      fields: items.fields,
      data: items.data.filter(item => item[itemsOffsets["hostid"]] === hostid)
    };
  }

  getZabbixSender({zabbixName}){
    return this.configurator
      .getMonitorConfig().zabbixes.find(z => z.name === zabbixName).zabbixSender
  }

  async query({zabbixName, dbName, itemid, hostid, period}){
    try{
      const connector = this.getDBConnector({dbName});
      assert.ok(connector,"No DB connector found for DB "+dbName+". Query "+
        zabbixName+", "+
        hostid+", "+
        itemid+", "+
        period+
        " is skipped."
      );
      this.getQueries({period, zabbixName, itemid}).forEach(async (q, i, arr) => {
        if(q.status !== "run"){
          arr[i].status = "run";
          try{
            const table = await connector.instance.query(q.query);
            //TODO implement noData option from params
            assert.ok(table.length > 0,"Query returned no data "+
              zabbixName+", "+
              hostid+", "+
              itemid+", "+
              period+", "+
              JSON.stringify(q));
            const data = TimerProcessor.convertToMonitoringData({query: q, table, items: this.getItems({zabbixName, hostid})});
            data.length > 0 && this.postProcessResults({data, sender: this.getZabbixSender({zabbixName})});
          }catch(e){
            console.warn(e.message);
          }finally{
            arr[i].status = "done";
          }
        }
      });
    }catch(e){
      console.error(e.message,e);
    }
  }

  cancelAllTimers() {
    debug("cancelAllTimers started");
    this.timers.forEach( t => t.timer && clearTimeout(t.timer));
    // clear timer Array
    this.timers.length = 0;
  }


}

module.exports = TimerProcessor;