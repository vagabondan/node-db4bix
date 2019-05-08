'use strict';
const Configurator = require('./configurator');
const DB = require('./dbs');
const debug = require('debug')("db4bix:mainProcessor");
debug('Init');


class TimerProcessor{

  constructor(opts){
    const timers = [];
    const configurator = {};
    Object.assign(this,{
      timers,
      configurator
    });
  }

  getDBConnector({db}){
    return new DB({db});
  }

  prepareToMonitor({conf}){
    this.cancelAllTimers();
    for (const zabbix of conf){
      for(const param of zabbix.params){
        const dbConnector = this.getDBConnector({db: zabbix.targets.dbs[param.db]});
        Object.keys(param.timers).forEach(period => {
          this.createTimer({period, dbConnector, queries: param.timers[period]});
        });
      }
    }
  }

  async init(){
    try{
      this.configurator = new Configurator();
      const conf = await this.configurator.updateConfiguration();
      this.prepareToMonitor({conf});
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


  createTimer({period, dbConnector, queries}) {
    //const timerId = setInterval(this.query, period*1000, {dbConnector, queries});
    const query = this.query.bind(this, {dbConnector, queries});
    const id = this.registerTimer();
    const registerTimer = this.registerTimer.bind(this);
    registerTimer(
      setTimeout(function setQuery(){
        query();
        registerTimer(setTimeout(setQuery, period*1000), id);
        },
        Math.random()*period*1000   // first run is randomly shifted
      ),
      id
    );
  }

  query({dbConnector, queries}){
    debug("Query "+queries.length+" requests for "+JSON.stringify(dbConnector)+". Number of timers: "+this.timers.length);
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