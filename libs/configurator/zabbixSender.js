"use strict";

const net = require('net');
const os  = require('os');
const defer = require('../utils/defer');
const drain = require('../utils/drain');
const fs    = require('fs');
const ini   = require('ini');
const assert = require('assert');

const ZBXD_HEADER  = Buffer.from('ZBXD\x01');
const ZBX_HEADER_LENGTH = ZBXD_HEADER.length + 8; // 8 bytes - size of "length field" in header
const ITEM_STATE_NOTSUPPORTED = 1;

Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
};

Date.prototype.toISOLocalDateTime = function() {
  return this.addHours(3).toISOString().replace(/\.\d+/, '');
};

Date.prototype.getClockNs = function(){
  const timestamp = this.getTime()/1000;
  return {clock: ~~timestamp, ns: (timestamp % 1).toFixed(3)*1e9}
};

const addClockNs = function(obj, clockNs){
  clockNs = clockNs || new Date().getClockNs();
  Array.isArray(obj) ? obj.push(clockNs.clock, clockNs.ns) : Object.assign(obj, clockNs);
  return obj;
};


class ZabbixSender {

  constructor({name, host, port, proxyName, timeout, hostname, version, session}) {
    Object.assign(this, {
      name: name || "DefaultZabbixName",
      host: host || 'localhost',
      port: port || 10051,
      proxyName: proxyName || os.hostname(),
      timeout: timeout || 5000,
      version: version || "4.2.4",
      hostname: hostname || os.hostname(),
      session: session || '61cc43a7f49d7712fd81bdcb53198d13',
    });
  }



  /**
   * @param string [host=]
   */
  async sendv(host, key, value){

    var args = Array.from(arguments);
    value = args.pop();
    key   = args.pop();
    host = args.pop() || this.hostname;

    return this.sendHistoryData([{host, key, value}]);
  }


  /**
   *
   * @param dict
   * @returns {Promise<any>}
   */
  async sendd(dict)  {

    var args = Array.from(arguments);
    dict  = args.pop();

    var list = [];

    const clockNs = new Date().getClockNs();
    for(var itemid in dict)
      list.push(addClockNs({itemid, value : dict[itemid]}, clockNs));
    return this.sendHistoryData(list);
  }


  /**
   * Sends items, LLD results to Zabbix server
   * @param data - history data - array of history data objects:
   * @returns {Promise<any>} - parsed response from Server
   */
  async sendHistoryData(data){
    const historyData = ZabbixSender.convertToHistoryData(data);
    return this.send(addClockNs({
      request : 'proxy data',
      host: this.proxyName,
      'history data': historyData,
      version: this.version,
      session: this.session,
    }));
  }

  /**
   *
   * @param data - is one of the following structures:
   * 1. [["<itemid1>","<value1>",<clock1>?,<ns1>?],...,]
   * 2. [{"<itemid1>":"<value1>"}, {"<itemid2>":"<value2>"}, {...}, ...]
   * 3. [{itemid:"<itemid1>", value:"<value1>"<, clock:"<clock1>", ns:"<ns1>">}, ...]
   * 4. {"<itemid1>":"<value1>", "<itemid2>":"<value2>", ...}
   * 5. {itemid:"<itemid1>", value:"<value1>"<, clock:"<clock1>", ns:"<ns1>">}
   * where value can be <any> type
   * @returns {Array}
   */
  static convertToHistoryData(data){
    let args = Array.from(arguments);
    data  = args.pop();
    return Array.isArray(data)?
      ZabbixSender.convertArrayToHistoryData(data):
      ZabbixSender.convertObjectToHistoryData(data);
  }

  static convertArrayToHistoryData(data, clockNs){
    let list = [];
    clockNs = clockNs || new Date().getClockNs();
    for (let item of data){
      try{
        if(Array.isArray(item)){ // item is Array: [itemid,value,clock?,ns? <, ignored>]
          assert.ok(item.length > 1,"item array should contain at least 2 elements: itemid and value");
          assert.ok(!isNaN(parseInt(item[0],10)),"itemid placeholder (idx=0) doesn't look like number in array: "
            + JSON.stringify(item));
          if (item.length >= 4) { // only [itemid, value, clock, ns <, ignored>] format is supported
            isNaN(parseInt(item[2], 10)) || console.warn("clock placeholder (idx=2) doesn't look like number in array: " + JSON.stringify(item));
            isNaN(parseInt(item[3], 10)) || console.warn("ns placeholder (idx=3) doesn't look like number in array: " + JSON.stringify(item));
            list.push(ZabbixSender.getHistoryObject( item[0], item[1],
              isNaN(parseInt(item[2], 10)) ? clockNs.clock : item[2],
              isNaN(parseInt(item[3], 10)) ? clockNs.ns : item[3]
            ));
          } else { // only [itemid, value] format is supported
            list.push(ZabbixSender.getHistoryObject( item[0], item[1], clockNs.clock, clockNs.ns ));
          }
        }else{ // item is object: it came from [{},{}, ..., {}]
          list = list.concat(ZabbixSender.convertObjectToHistoryData(item, clockNs));
        }
      }catch(e){
        console.error(e.message,e);
      }
    }
    return list;
  }

  static convertObjectToHistoryData(data, clockNs){
    const list = [];
    clockNs = clockNs || new Date().getClockNs();
    if(data.hasOwnProperty("itemid")){ // {itemid: <itemid1>, value: <value1>}
      assert.ok(!isNaN(parseInt(data.itemid,10)),"itemid property doesn't look like number in object: " + JSON.stringify(data));
      if(!data.hasOwnProperty("value")){
        data.state = ITEM_STATE_NOTSUPPORTED;
        data.value = "No value provided, but itemid exists for item: " + JSON.stringify(data);
      }
      list.push(ZabbixSender.getHistoryObject(data.itemid, data.value, data.clock || clockNs.clock, data.ns || clockNs.ns));
    }else {
      // item is object and it does not have itemid property, then it has to be in form:
      // {<itemid1>:<value1>}
      for (const itemid in data) {
        try {
          if (data.hasOwnProperty(itemid)) {
            assert.ok(!isNaN(parseInt(itemid, 10)), "itemid doesn't look like number in object: { " + itemid + ":" + JSON.stringify(data[itemid]));
            list.push(ZabbixSender.getHistoryObject(itemid, data[itemid], clockNs.clock, clockNs.ns));
          }
        } catch (e) {
          console.error(e.message, e);
        }
      }
    }
    return list;
  }

  static getHistoryObject(itemid, value, clock, ns){
    return addClockNs({
      itemid,
      value: Array.isArray(value) ?
        /*LLD*/ JSON.stringify({data: value}):
        /*Ordinary item*/ JSON.stringify(value),

    }, (clock && ns) && {clock, ns})
  }

  /**
   *
   * @returns {Promise<any>}
   */
  async requestConfig(){
     return this.send({
       request: 'proxy config',
       host: this.proxyName,
       version: this.version
     });
  }

  /**
   * Just sends data over the network
   * @param data - any payload to send to Zabbix Server
   *
   * [{
     itemid	number	item identifier
     clock	number	item value timestamp (seconds)
     ns	number	item value timestamp (nanoseconds)
     value	string	(optional) item value
     timestamp	number	(optional) timestamp of log type items
     source	string	(optional) eventlog item source value
     severity	number	(optional) eventlog item severity value
     eventid	number	(optional) eventlog item eventid value
     state	string	(optional) item state
     0, ITEM_STATE_NORMAL
     1, ITEM_STATE_NOTSUPPORTED
     lastlogsize	number	(optional) last log size of log type items
     mtime	number	(optional) modify time of log type items
   }, {},...]
   *
   * @returns {Promise<any>} - parsed JSON object
   * throws exceptions if something goes wrong
   */
  async send(data){
    data = ZabbixSender.protocolWrap(data);
    const timeout = defer(new Error("Abort connecting to Zabbix Server: "+
    this.name+"@"+this.host+":"+this.port+" by timeout set to " + this.timeout + " ms."));
    const i = setTimeout(timeout.reject, this.timeout);
    const client = new net.Socket();
    client.on('error', timeout.reject);
    try {
      let connect = new Promise((resolve) => client.connect(this.port, this.host, resolve));
      await Promise.race([connect, timeout]);
      client.write(data);
      let response = await Promise.race([drain(client), timeout]);
      return ZabbixSender.parseResponse(response);
    }
    /*
    catch(err){
      console.error(err);
      throw(err);
    }
    */
    finally {
      clearTimeout(i);
      client.destroy();
    }
  }

  /**
   * Wraps sending data to Zabbix Header
   * @param data
   * @returns {Buffer}
   */
  static protocolWrap(data){
    let payload = Buffer.from(JSON.stringify(data), 'utf8');
    let size  = Buffer.alloc(4); size.writeInt32LE(payload.length);
    return Buffer.concat([ZBXD_HEADER, size, Buffer.from('\x00\x00\x00\x00'), payload]);
  }

  /**
   * Parses Zabbix Server response
   * @param response
   * @returns {any}
   */
  static parseResponse(response){
    if(!response.slice(0, ZBXD_HEADER.length).equals(ZBXD_HEADER))
      throw "Got invalid response from server: " + response;
    return JSON.parse(response.slice(ZBX_HEADER_LENGTH));
  }

}


module.exports = ZabbixSender;