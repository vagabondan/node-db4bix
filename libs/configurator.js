"use strict";
const os  = require('os');
const fs    = require('fs');
const ini   = require('ini');
const assert = require('assert');
const Sender = require('./zabbixSender');
const xmlParser = require('fast-xml-parser');
const he = require('he');
const escapeStringRegexp = require('escape-string-regexp');

const debug = require('debug')("db4bix:configurator");
debug('Init');

const zabbix_conf_path = './config/db4bix.conf';

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

const addClockNs = function(obj, clockNS){
  clockNS = clockNS || new Date().getClockNs();
  Array.isArray(obj) ? obj.push(clockNS.clock, clockNS.ns) : Object.assign(obj, clockNS);
  return obj;
};


class Configurator {

  /**
   * initialize from local ini file
   * @param opts
   */
  constructor(opts) {
    let host = 'localhost';
    let config = {};
    let port = 10051;
    let timeout = 5000;
    let proxyName = os.hostname();
    let version = "3.4.12";
    const xmlParserOptions = {
      attributeNamePrefix : "",
      attrNodeName: false, //default is 'false'
      textNodeName : "query",
      ignoreAttributes : false,
      ignoreNameSpace : false,
      allowBooleanAttributes : false,
      parseNodeValue : true,
      parseAttributeValue : false,
      trimValues: true,
      cdataTagName: "__cdata", //default is 'false'
      cdataPositionChar: "\\c",
      localeRange: "", //To support non english character in tag/attribute values.
      parseTrueNumberOnly: false,
      attrValueProcessor: a => he.decode(a, {isAttributeValue: true}),//default is a=>a
      tagValueProcessor : a => he.decode(a) //default is a=>a
    };

    const servers = [];
    if(fs.existsSync(zabbix_conf_path)){
      config = ini.parse(fs.readFileSync(zabbix_conf_path, 'utf-8'));
      for(const serverName in config.Zabbix){
        if(config.Zabbix.hasOwnProperty(serverName)){
          try{
            const dbs = {};
            for(const dbName of config.Zabbix[serverName].DBList){
              try{
                assert.ok(config.DB.hasOwnProperty(dbName),"No section "+dbName+" found in config, but it appears in server "+serverName+" DBList: "+JSON.stringify(config.Zabbix[serverName].DBList));
                dbs[dbName] = config.DB[dbName];
              }catch(e){
                console.error("Failed getting config for DB "+dbName+": "+e.message,e);
              }
            }
            servers.push({
              name: serverName,
              host: config.Zabbix[serverName].Host || host,
              port: config.Zabbix[serverName].Port || port,
              proxyName: config.Zabbix[serverName].ProxyName || proxyName,
              timeout: config.Zabbix[serverName].Timeout || timeout,
              version: config.Zabbix[serverName].Version || version,
              configSuffix: config.Zabbix[serverName].ConfigSuffix || 'DB4bix.config',
              hostname : os.hostname(),
              config: config.Zabbix[serverName],
              dbs,
              opts,
            });
          }catch(e){
            console.error("Failed getting config for server " + serverName + ": " + e.message,e);
          }
        }        
      }
    }

    Object.assign(this, {
      config,
      zabbixServers: servers,
      hostname : os.hostname(),
      xmlParserOptions
    }, opts);
  }

  async getConfigsFromZabbix(){
    const zabbixes = this.zabbixServers;
    zabbixes.forEach(z => z.zabbixSender = z.zabbixSender || new Sender(z));
    return Promise.all(zabbixes.map(z => z.zabbixSender.requestConfig()));
  }

  parseXMLConfig({xml}){
    let jsonObj = {};
    const options = this.xmlParserOptions;

    const validObj = xmlParser.validate(xml);
    if( validObj === true) { //optional (it'll return an object in case it's not valid)
      jsonObj = xmlParser.parse(xml,options);
    }else{
      assert.fail("XML validation failed: "+JSON.stringify(validObj));
    }
    // Intermediate obj
    //const tObj = xmlParser.getTraversalObj(xml,options);
    //jsonObj = xmlParser.convertToJson(tObj,options);

    // convert objects to Array for simplicity
    ["discovery", "query", "multiquery"].forEach( paramType => {
      !Array.isArray(jsonObj.parms.server[paramType]) ?
        jsonObj.parms.server[paramType] = jsonObj.parms.server.hasOwnProperty(paramType) ? [].concat(jsonObj.parms.server[paramType]) : []
        : null ;
    });

    return Object.assign({
      prefix: jsonObj.parms.prefix,
      type: jsonObj.parms.type,
    }, jsonObj.parms.server);
  }

  /**
   * Groups macros by hosts
   * @param hostmacro
   */
  getHostMacros({hostmacro}){
    const hostmacroid = hostmacro.fields.findIndex(f => f === "hostmacroid");
    const hostid = hostmacro.fields.findIndex(f => f === "hostid");
    const macro = hostmacro.fields.findIndex(f => f === "macro");
    const value = hostmacro.fields.findIndex(f => f === "value");

    const macros ={};
    hostmacro.data.forEach(m => {
      if(!Array.isArray(macros[m[hostid]])){
        macros[m[hostid]] = [];
      }
      macros[m[hostid]].push({
        macro: m[macro],
        value: m[value],
        hostmacroid: m[hostmacroid]
      });
    });

    return macros;
  }


  /**
   * Substitute macros inside target
   * @param target - any object or Array
   * @param macros - array of objects {macro, value}
   */
  static substituteMacros({target, macros}){
    const macroRegExp = /\{\$[^}]+\}/gm;

    const iterateProps = function (obj, fn){
      if(Array.isArray(obj)){
        obj.forEach((v, i) => obj[i] = iterateProps(v, fn));
      }else if(obj && typeof obj === "object"){
        Object.keys(obj).forEach(key => obj[key] = iterateProps(obj[key], fn));
      }else if(typeof obj === "string"){
        obj = fn(obj);
      }
      return obj;
    };

    target = iterateProps(target,(str) =>{
      const matches = str.match(macroRegExp);
      if(matches){
        matches.forEach(m => {
          const macro = macros.find(m1 => m1.macro === m);
          if(macro){
            str = str.replace(m, macro.value, "gm");
          }else{
            console.warn("Couldn't find macro "+m+" in macros library! Leave it unsubstituted.");
          }
        });
      }
      return str;
    });

    return target;
  }

  /**
   * Groups params by time
   * @param params
   */
  static groupParamsByTime({params}){
    const result = {};
    ["discovery", "query", "multiquery"].forEach(paramType => {
        // Param type is always array
        params[paramType].forEach(param => {
          Array.isArray(result[param.time]) ?
            result[param.time].push(param) :
            result[param.time] = [].concat(param);
        });
    });
    return result;
  }

  async parseConfigsFromZabbix(){
    const zbxConfigs = await this.getConfigsFromZabbix();
    const zabbixes = this.zabbixServers;
    for (let i=0; i < zbxConfigs.length; ++i){ // for each Zabbix Server
      const zcfg = zbxConfigs[i];
      zabbixes[i].zbxConfig = zcfg;
      const hostmacros = this.getHostMacros({hostmacro: zcfg.hostmacro});


      // Offsets in items array
      const keyOffset = zcfg.items.fields.findIndex(f => f === "key_");
      const paramsOffset = zcfg.items.fields.findIndex(f => f === "params");
      const hostidOffset = zcfg.items.fields.findIndex(f => f === "hostid");
      const itemidOffset = zcfg.items.fields.findIndex(f => f === "itemid");

      // Substitute macros in all items
      zcfg.items.data.forEach((item, ind, arr ) => {
        arr[ind][keyOffset] = Configurator.substituteMacros({target: item[keyOffset], macros: hostmacros[item[hostidOffset]]});
        arr[ind][paramsOffset] = Configurator.substituteMacros({target: item[paramsOffset], macros: hostmacros[item[hostidOffset]]});
      });

      /**
       * Regexp for config suffix in Zabbix: DB4bix.config[...,<DSN>]
       * @type {RegExp}
       */
      const cfgSuffixRegExp = new RegExp(".*\\."+escapeStringRegexp(zabbixes[i].configSuffix)+"\\[(?:.*,)?([^,\\[\\]\\s]+){1}\\]","i");


      // Find all configuration items within Zabbix Server
      const cfgItems = zcfg.items.data.filter(item => cfgSuffixRegExp.test(item[keyOffset]));
      zabbixes[i].paramsConfigs = [];
      for(let j=0; j < cfgItems.length; ++j){ // parse all configuration items
        const hostid = cfgItems[j][hostidOffset];
        const itemid = cfgItems[j][itemidOffset];
        const key = cfgItems[j][keyOffset];
        const dbName = cfgSuffixRegExp.exec(key)[1];

        // Prepare params configuration
        const paramsXML = cfgItems[j][paramsOffset];                                    // get params in XML form
        const paramsParsed = this.parseXMLConfig({xml: paramsXML});                     // parse XML to JSON
        const paramsByTime = Configurator.groupParamsByTime({params: paramsParsed});    // group params by time

        zabbixes[i].paramsConfigs.push({                                                // save params config
          itemid,
          hostid,
          db: dbName,
          params: paramsByTime
        });

      }

      debug(cfgItems);
    }
  }


}


module.exports = new Configurator();