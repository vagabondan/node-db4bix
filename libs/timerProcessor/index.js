'use strict';
require('../utils/date');
const Configurator = require('../configurator');
const DB = require('../dbs');
const Storage = require('./storage');
const Cache = require('./cache');
const hash = require('object-hash');
const assert = require('assert');
const ZabbixPreprocessor = require('../zabbixPreprocessor');

const debug = require('../utils/debug-vars')('TimerProcessor');

debug.debug('Init');


class TimerProcessor{

  constructor(opts){
    Object.assign(this,{
      timers: [],
      monitors: [],
      senders: [],
      configurator: {},
      storage: undefined,
      preprocCache: undefined,
      dbConnectors: [],
      updateTimerId: undefined,
      zbxPreproc: undefined,
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
    dbs.forEach(delDB => {
      const index = this.dbConnectors.findIndex( db => db.conf.name === delDB.conf.name);
      index >=0 ? this.dbConnectors.splice(index,1) : null;
    });
  }

  /**
   * Deletes, adds, updates databases entities
   * @param {dbs} databases list 
   */
  updateTargets({dbs}){
    //delete
    const newDBNames = dbs.map(db => db.name);
    const dbToDelete = this.dbConnectors.filter(c => !newDBNames.includes(c.conf.name));
    this.deleteDBs({dbs: dbToDelete});

    // add/update
    dbs.forEach(db => {
      try{
        this.registerDB({conf: db});
      }catch(err){
        debug.error("Error while registering DB: " + 
          JSON.stringify({type: db.type, instance: db.instance, host: db.host, user: db.user}), err);
      }
    });
  }

  /**
   * Update monitors list.
   * Monitor is the entity containing: 
   * zabbix servers configuration, target db config, execution period, query to execute, timer id (which executes query)
   * @param {conf} configuration 
   */
  updateMonitors({conf}){
    const monitors =[];
    for (const zabbix of conf.zabbixes){
      for(const {dbName, confItemid, hostid, timers} of zabbix.params){
        Object.keys(timers).forEach(period => {
          const monitorNew = {zabbixName: zabbix.name, dbName, confItemid, hostid, period};
          const monitorOld = this.monitors.find(m =>
            Object.keys(monitorNew).reduce((acc, key) =>
              m[key] === monitorNew[key] && acc, true)
          );
          if(monitorOld){ // add
            monitors.push(Object.assign(monitorNew, {timerid: monitorOld.timerid}));
          } else{
            const query = this.query.bind(this, monitorNew);  // partial bound query method with monitor settings
            const timerid = this.createTimer({period, query});
            monitors.push(Object.assign(monitorNew, {timerid}));
          }
        });
      }
    }

    // delete old non-actual timers for old monitorss
    /**
     * monitors - is ethalon
     * this.monitor - old monitors
     */
    const toDelete = this.monitors.filter(m =>
      !monitors.find(mNew =>
        Object.keys(m).reduce((acc, key) => m[key] === mNew[key] && acc ,true)
      )
    );
    toDelete.forEach( m =>
      this.cancelTimer({id: m.timerid})
    );

    // Update!
    this.monitors = monitors;

  }

  prepareToSendData({period}){
    const query = this.sendData.bind(this);
    return this.createTimer({period, query, firstDelay: period});
  }

  /**
   * Periodically sends data to Zabbix Server
   * @param {sendersConf} Array of senders configurations 
   */
  updateSendData({sendersConf}){
    const senders = [];
    sendersConf.forEach(c => {
      const senderNew = {zabbixName: c.zabbixName, period: c.sendDataPeriod};
      const senderOld = this.senders.find(s => s.zabbixName === senderNew.zabbixName && s.sendDataPeriod === senderNew.sendDataPeriod);
      if(senderOld){ // add to registry
        senders.push(Object.assign(senderNew, {timerid: senderOld.timerid}))
      }else{          // create new one
        const query = this.sendData.bind(this, {zabbixName: c.zabbixName});
        const timerid = this.createTimer({period: c.sendDataPeriod, query, firstDelay: c.sendDataPeriod});
        senders.push(Object.assign(senderNew, {timerid}));
      }
    });

    // delete old non-actual timers for old senders
    /**
     * senders - is ethalon
     * this.senders - old senders
     */
    const toDelete = this.senders.filter(s =>
      !senders.find(sNew =>
        s.zabbixName === sNew.zabbixName && s.sendDataPeriod === sNew.sendDataPeriod
      )
    );
    toDelete.forEach( m =>
      this.cancelTimer({id: m.timerid})
    );

    // Update
    this.senders = senders;

  }

  prepareToMonitor({conf}){
    this.updateTargets({dbs: conf.dbs});
    for (const zabbix of conf.zabbixes){
      for(const {dbName, confItemid, hostid, timers} of zabbix.params){
        //assert.ok(fileConfig.DB.hasOwnProperty(dbName),"No section [DB."+dbName+"] found in file config, but it appears in section [Zabbix."+serverName+"].dbs: "+JSON.stringify(zabbix.dbs));
        Object.keys(timers).forEach(period => {
          const query = this.query.bind(this, {zabbixName: zabbix.name, dbName, confItemid, hostid, period});
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
          let newPeriod = undefined;
          try{
            // if query returns value, then it should be new period
            newPeriod = await query();
          }catch(e){
            debug.error("Exception on query for timer id: "+id+". Message: "+e.message,e);
          }finally {
            newPeriod = isNaN(newPeriod) ? period : checkPeriod(newPeriod);
            registerTimer(setTimeout(setQuery, newPeriod));                   // reset timer with bound id
          }
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

  /**
   * Main initialization method: starts periodic update of everything
   */
  async init(){
    try{
      this.storage = new Storage();
      this.preprocCache = new Cache();
      this.configurator = new Configurator();
      const query = this.updatePeriodically.bind(this);
      this.updateTimerId = this.createTimer({period: this.configurator.getUpdatePeriod(), query, firstDelay: 0.5});
      this.zbxPreproc = new ZabbixPreprocessor();
    }catch(e){
      debug.error("Error on init: "+e.message,e);
    }
  }

  /**
   * Method explains what it means: update everything.
   * It is executed periodically.
   * 
   * @returns next update period of everything
   */
  async updatePeriodically(){
    try{
      this.storage = this.storage || new Storage();
      const configurator = new Configurator();
      // 1. We have to update our configuration
      const conf = await configurator.updateConfiguration();
      // 2. Update databases entities list
      this.updateTargets({dbs: conf.dbs});
      // 3. Update monitors list
      this.updateMonitors({conf});

      // 4. Get senders configurations list and update senders
      const sendersConf = conf.zabbixes.map(z => {
        return {
          zabbixName: z.name,
          sendDataPeriod: z.sendDataPeriod
        }
      });
      this.updateSendData({sendersConf});

      // 5. finally update configurator itself
      this.configurator = configurator;
    }catch(e){
      debug.error("Error on updatePeriodically: "+e.message,e);
    }
    return this.configurator.getUpdatePeriod()
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

  getItemPreprocessingSteps({zabbixName, itemid}){
    const zabbix = this.configurator.zabbixes.find(z => z.name === zabbixName);
    return zabbix && zabbix.zabbixConfig.item_preproc[itemid];
  }


  /**
   * 
   * @param item - is object whith key=itemid, and value=item_value
   * @param preprocSteps - is array of steps which in turn are arrays of step parameters: 
   * [type, params, error_handler, error_handler_params, history_value, historyClock, historyNs]
   */
  getPreprocessedItem({item, zabbixName}){
    let [itemid, itemValue, clock, ns, itemValueType] = item;
    const preprocSteps = this.getItemPreprocessingSteps({zabbixName, itemid});
    if(!Array.isArray(preprocSteps)){
      return item;
    }
    // cache structure: {itemid,[]}
    const zbxCache = this.preprocCache.get(zabbixName) || this.preprocCache.add(zabbixName, new Cache());
    let history = zbxCache.get(itemid);
    
    if(!history || history.length !== preprocSteps.length)
      // if history is empty fill history cache with empty strings: [[historyValue, historyClock, historyNs],[], ...]
      history = zbxCache.add(itemid, preprocSteps.reduce(acc => (acc.push(["", "", ""]), acc), []));

    let throwMe = undefined;
    // preprocess step by step
    itemValue = preprocSteps.reduce(
      // [item_value, clock, ns, item_value_type, 
      //    op_type, op_params, op_error_handler, op_error_handler_params, 
      //    historyValue, historyClock, historyNs]
      (acc, cur, i) => {
        let preprocessed = acc;
        const input = [acc, clock, ns, itemValueType].concat(cur, history[i]);
        debug.debug("Zabbix["+zabbixName+"]: itemid["+itemid+"]: step["+i+"]: preprocess input:",input);
        try{
          preprocessed = this.zbxPreproc.preprocess(input);
        }catch(e){
          if(!history[i][0] || !history[i][1] || history[i][1] <= 0)
            debug.info("Exception while preprocessing Zabbix["+zabbixName+"]: itemid["+itemid+"]: step["+i+"]: input =",input,e);
          else
            debug.error("Exception while preprocessing Zabbix["+zabbixName+"]: itemid["+itemid+"]: step["+i+"]: input =",input,e);
          // we do not throw immediately to be able to initialize the whole chain of history values
          //throwMe = throwMe || e;
          // we throw immediately because only one change element (that needs history value) is allowed
          throw(e);
        }finally{
          // history value
          history[i][0] = acc;
          // history clock, ns
          history[i][1] = clock;
          history[i][2] = ns;              
        }
        return preprocessed;
      },
      itemValue.toString()
    );

    // throw it if you have to
    //if(throwMe) throw(throwMe);

    return [itemid, itemValue, clock, ns, itemValueType];
  }

  postProcessMonitoingData({monitoringData, sender}){
    // data before preprocessing
    debug.debug("data before preprocessing: "+JSON.stringify(monitoringData));

    let data = monitoringData.data;
    const zabbixName = sender.name;

    // preprocess items
    // finally data became in format: [itemid, item_value, clock, ns]
    data = data.reduce((acc, item) => {
      try{
        acc.push(this.getPreprocessedItem({item, zabbixName}))
      }catch(e){
        debug.info("Zabbix["+zabbixName+"]: itemid["+item[0]+"]: skipped from results because of exception",e);
      }
      return acc;
    }, []);

    // data after preprocessing
    debug.debug("data after preprocessing: "+JSON.stringify(data));

    // save data to storage for later sending
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

  static addMonitoringData({arr, itemid, itemValue, itemValueType}){
    return arr.push([itemid, itemValue, itemValueType]) && arr;
  }

  /**
   * 
   * @param query
   * @param table
   * @param items
   * @returns {Array}
   */
  static convertToMonitoringData({query, table, items}){
    const clockNs = new Date().getClockNs();
    const keyOffset = items.fields.findIndex(f => f === "key_");
    const itemidOffset = items.fields.findIndex(f => f === "itemid");
    const valueTypeOffset = items.fields.findIndex(f => f === "value_type");
    const result = {data:[], fields:["itemid", "value", "clock", "ns", "value_type"]};
    if(query.names){  // discovery!
      const names = query.names.split("|").map(name => "{#"+name+"}");  // generate user-macro names
      const keyValueArray = TimerProcessor.produceKeyValueArray({keys: names, table});
      const item = items.data.find(item => item[keyOffset] === query.item);
      // item && data.push({ [item[itemidOffset]]: keyValueArray });
      item && result.data.push([ item[itemidOffset], keyValueArray, clockNs.clock, clockNs.ns, item[valueTypeOffset] ]);
    }else{        // ordinary query
      
      // 1. generate key-value array
      let keyValueArray;
      if(query.type === "list"){
        // multiquery of type list contains "items" attribute without prefixes
        const itemKeys = query.items.split("|"); // can be key1|key2|key3
        const itemKeysPrefixed = query.item.split("|"); // can be prefix.key1|prefix.key2|prefix.key3
        keyValueArray = table.reduce((acc, row)=>{
          const keyIndex = itemKeys.findIndex(key => key === row[0].toString().trim().toLocaleLowerCase());
          keyIndex >= 0 && acc.push({ [itemKeysPrefixed[keyIndex]] : row[1] });
          return acc;
        },[]);
      }else{ // type = "column"
        const itemKeys = query.item.split("|"); // can be key1|key2|key3
        keyValueArray = TimerProcessor.produceKeyValueArray({keys: itemKeys, table});
      }
      // 2. resolve itemid
      result.data = keyValueArray.reduce((acc, obj)=>{
          acc = Object.keys(obj).reduce((acc1, key)=>{
            const item = items.data.find(item => item[keyOffset] === key);
            //item && acc1.push({ [item[itemidOffset]]: obj[key] });
            item && acc1.push([
              // [itemid, item_value, clock, ns, item_value_type]
              item[itemidOffset], obj[key], clockNs.clock, clockNs.ns, item[valueTypeOffset]
            ]);
            return acc1;
          }, acc);
          return acc;
        }, 
        result.data
      );
    
    }
    return result;
  }

  getQueries({period, zabbixName, confItemid}){
    return this.configurator
      .getMonitorConfig()
      .zabbixes.find(z => z.name === zabbixName)
      .params.find(p => p.confItemid === confItemid)
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

  /**
   * Main execution function. It is invoked by timers being bound with appropriate configuration
   * @param {*} param0 
   */
  async query({zabbixName, dbName, confItemid, hostid, period}){
    try{
      const connector = this.getDBConnector({dbName});
      assert.ok(connector,"No DB connector found for DB "+dbName+". Query "+
        zabbixName+", "+
        hostid+", "+
        confItemid+", "+
        period+
        " is skipped."
      );
      this.getQueries({period, zabbixName, confItemid}).forEach(async (q, i, arr) => {
        if(q.status !== "run"){
          arr[i].status = "run";
          try{
            const table = await connector.instance.query(q.query);
            //TODO implement noData option from params
            assert.ok(table.length > 0,"Query returned no data "+
              zabbixName+", "+
              hostid+", "+
              confItemid+", "+
              period+", "+
              JSON.stringify(q));
            const monitoringData = TimerProcessor.convertToMonitoringData({query: q, table, items: this.getItems({zabbixName, hostid})});
            monitoringData.data.length > 0 && this.postProcessMonitoingData({monitoringData, sender: this.getZabbixSender({zabbixName})});
          }catch(e){
            debug.warn(e.message);
          }finally{
            arr[i].status = "done";
          }
        }
      });
    }catch(e){
      debug.error(e.message,e);
    }
  }

  cancelTimer({id}){
    const index = this.timers.findIndex(t => t.id === id);
    // stop timer
    clearTimeout(this.timers[index].timer);
    // delete timer
    this.timers.splice(index,1);
  }

  cancelAllTimers() {
    debug.debug("cancelAllTimers started");
    this.timers.forEach( t => t.timer && clearTimeout(t.timer));
    // clear timer Array
    this.timers.length = 0;
  }

}

module.exports = TimerProcessor;