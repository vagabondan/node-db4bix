'use strict';
const Configurator = require('./configurator');
const DB = require('./dbs');
const Storage = require('./storage');
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
      sender: undefined
    });
  }

  getDBConnector({config}){
    const connector = new DB({config});
    connector.init();
    return connector;
  }

  prepareToMonitor({conf}){
    this.cancelAllTimers();
    for (const zabbix of conf){
      for(const param of zabbix.params){
        // filter items for given hostid

        /**
         * We need only these fields from items:
         *
         "itemid",
         "type",
         "hostid",
         "key_",
         "status",
         "value_type",
         "params"
         *
         * @type {{fields}}
         */

        const itemFieldNames = ["itemid", "type", "hostid", "key_", "status", "value_type", "params"];
        //const itemIndices = itemFieldNames.map(field => zabbix.items.fields.findIndex(field));
        const itemIndices = itemFieldNames.reduce((acc, field) => Object.assign(acc, {field: zabbix.items.fields.findIndex(field)}), {});
        const items = {
          fields: itemFieldNames,
          data: zabbix.items.data
            .filter(item => item[itemIndices["hostid"]] === param.hostid)                                     // only current host items should stay
            .map(item => item.filter((field, index)=> Object.values(itemIndices).includes(index)))  // nly useful fields of items should stay
        };
        const dbConnector = this.getDBConnector({config: zabbix.targets.dbs[param.db]});
        Object.keys(param.timers).forEach(period => {
          this.createMonitorTimer({period, dbConnector, queries: param.timers[period], sender: zabbix.sender, items});
        });
      }
    }
  }

  async sendData(){
    const data = await this.storage.popAll();
    data.length = 0;
  }

  prepareToSendData({period}){
    const id = this.registerTimer();
    const registerTimer = this.registerTimer.bind(this);
    const sendData = this.sendData.bind(this);
    registerTimer(
      setTimeout(async function setSendData(){
          await sendData();
          registerTimer(setTimeout(setSendData, period*1000), id);
        },
        period*1000
      ),
      id
    );
  }

  async init(){
    try{
      this.configurator = new Configurator();
      this.storage = new Storage();
      const conf = await this.configurator.updateConfiguration();
      this.prepareToMonitor({conf});
      this.prepareToSendData({period: 60});
      debug(conf);
    }catch(e){
      console.error("Error getting config from Zabbix",e);
    }
  }

  /**
   *
   * @param timer
   * @param id
   * @returns id
   */
  registerTimer(timer, id) {
    // First, get rid of nulls, undefined, holes in timers  array
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
        Math.random()*period*1000   // first run is randomly shifted
      ),
      id
    );
  }

  postProcessResults({data, sender, items}){
    // 1. substitute params macros
    // 2. build appropriate data format
    // 3. save data to storage for sending


  }

  async query({dbConnector, queries, sender, items}){
    //const result = await Promise.all(queries.map(q => dbConnector.query(q.query))); // bad: unknown time of execution
    queries.forEach(async (q, i, arr) => {
      if(q.status !== "run"){
        arr[i].status = "run";
        let result = undefined;
        try{
          result = await dbConnector.query(q.query);
          this.postProcessResults({data: result, sender, items});
        }catch(e){
          console.error("[Error]: " + e.message + ". [DB]: "+
            Object.keys(dbConnector.config).filter(key => !key.includes('password'))
              .reduce((acc, key) => acc+key+": "+dbConnector.config[key]+", ","") +
            " while querying: "+JSON.stringify(q), e);
        }finally{
          arr[i].status = "done";
        }
      }
    });
    //debug("Query "+queries.length+" requests for "+dbConnector.config.instance+". Number of timers: "+this.timers.length);
    //debug(result);
  }

  cancelAllTimers() {
    debug("cancelAllTimers started");
    for(const timer of this.timers){
      timer.timer && clearTimeout(timer.timer);
    }
    // clear timer Array
    this.timers.length = 0;
  }
}

module.exports = TimerProcessor;