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
    let fileConfig = {};
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

    const zabbixes = [];
    let dbs = [];
    if(fs.existsSync(zabbix_conf_path)){
      fileConfig = ini.parse(fs.readFileSync(zabbix_conf_path, 'utf-8'));

      // Zabbix servers
      Object.keys(fileConfig.Zabbix).forEach(serverName => {
        const zabbix = fileConfig.Zabbix[serverName];
        try{
          zabbixes.push({
            name: serverName,
            updateConfigPeriod: fileConfig.updateConfigPeriod,
            sendDataPeriod: zabbix.sendDataPeriod || 60,
            host: zabbix.host || host,
            port: zabbix.port || port,
            proxyName: zabbix.proxyName || proxyName,
            timeout: zabbix.timeoutMillis || timeout,
            version: zabbix.version || version,
            configSuffix: zabbix.configSuffix || 'DB4bix.config',
            hostname : os.hostname(),
            fileConfig: zabbix,
          });
        }catch(e){
          console.error("Failed getting fileConfig for server " + serverName + ": " + e.message,e);
        }
      });

      // DBs
      dbs = Object.keys(fileConfig.DB).reduce((acc,dbName) => {
        // merge DB section data with Pool section data
        acc.push(Object.assign(fileConfig.DB[dbName], {pool: fileConfig.Pool[fileConfig.DB[dbName].pool || "Common"]}, {name: dbName}));
        return acc;
      },[]);

    }

    Object.assign(this, {
      fileConfig,
      zabbixes,
      dbs,
      hostname : os.hostname(),
      xmlParserOptions
    }, opts);
  }

  getMonitorConfig(){
    return {
      zabbixes: this.zabbixes,
      dbs: this.dbs
    };
  }

  async getConfigsFromZabbix(){
    const zabbixes = this.zabbixes;
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
   * Groups macros by hostid
   * @param hostmacro
   */
  groupMacrosByHostid({hostmacro}){
    const hostmacroidOffset = hostmacro.fields.findIndex(f => f === "hostmacroid");
    const hostidOffset = hostmacro.fields.findIndex(f => f === "hostid");
    const macroOffset = hostmacro.fields.findIndex(f => f === "macro");
    const valueOffset = hostmacro.fields.findIndex(f => f === "value");

    const macros ={};
    hostmacro.data.forEach(m => {
      if(!Array.isArray(macros[m[hostidOffset]])){
        macros[m[hostidOffset]] = [];
      }
      macros[m[hostidOffset]].push({
        macro: m[macroOffset],
        value: m[valueOffset],
        hostmacroid: m[hostmacroidOffset]
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
          // items => item
          param.items ? param.item = param.items : null;
          // prefix + item
          param.item = param.item.split("|").map(key => params.prefix+key).join("|");
          Array.isArray(result[param.time]) ?
            result[param.time].push(param) :
            result[param.time] = [].concat(param);
        });
    });
    return result;
  }

  /**
   * Zabbix data helper
   * @param source
   * @param fields
   */
  static getFieldOffsetMap({source, fields}){
    fields = fields || source.fields;
    return fields.reduce(
      (acc, field) =>{
        acc[field] = source.fields.findIndex(f => f === field);
        return acc;
      },
      {}
    );
  }

  static getUsefulFields({fields, source}){
    const indices = Configurator.getFieldOffsetMap({fields, source});
    return {
      fields: fields,
      data: source.data
        .map(item => item.filter((field, index)=> Object.values(indices).includes(index)))  // only useful fields of items should stay
    };
  }

  async updateConfiguration(){
    const zbxConfigs = await this.getConfigsFromZabbix();
    const zabbixes = this.zabbixes;
    for (let i=0; i < zbxConfigs.length; ++i) { // for each Zabbix Server
      let {hosts, hostmacro, items} = zbxConfigs[i];
      items = Configurator.getUsefulFields({fields: ["itemid", "type", "hostid", "key_", "status", "value_type", "params"], source: items});
      hosts = Configurator.getUsefulFields({fields: ["hostid", "host", "status", "name"], source: hosts});
      zabbixes[i].zabbixConfig = {
        hosts, items, hostmacro
      };
    }

    zabbixes.forEach( zabbix => {
      const zcfg = zabbix.zabbixConfig;
      const hostmacros = this.groupMacrosByHostid({hostmacro: zcfg.hostmacro});

      // Offsets in items array
      const itemsOffsets = Configurator.getFieldOffsetMap({source: zabbix.zabbixConfig.items});
      const keyOffset = itemsOffsets["key_"];
      const paramsOffset = itemsOffsets["params"];
      const hostidOffset = itemsOffsets["hostid"];
      const itemidOffset = itemsOffsets["itemid"];

      // Substitute macros in all items
      zcfg.items.data.forEach((item, ind, arr ) => {
        arr[ind][keyOffset] = Configurator.substituteMacros({target: item[keyOffset], macros: hostmacros[item[hostidOffset]]});
        arr[ind][paramsOffset] = Configurator.substituteMacros({target: item[paramsOffset], macros: hostmacros[item[hostidOffset]]});
      });

      /**
       * Regexp for config suffix in Zabbix: DB4bix.config[...,<DSN>]
       * @type {RegExp}
       */
      const cfgSuffixRegExp = new RegExp(".*\\."+escapeStringRegexp(zabbix.configSuffix)+"\\[(?:.*,)?([^,\\[\\]\\s]+){1}\\]","i");
      // Find all configuration items within Zabbix Server
      const cfgItems = zcfg.items.data.filter(item => cfgSuffixRegExp.test(item[keyOffset]));
      zabbix.params = cfgItems.reduce((acc, item) =>{
          try{
            // First, check security consuderations
            const dbName = cfgSuffixRegExp.exec(item[keyOffset])[1];
            assert.ok(zabbix.fileConfig.dbs.includes(dbName),"Zabbix server "+zabbix.name+" is not allowed to monitor DB "+dbName+
              ". Please check DB4bix "+zabbix.proxyName+" file config or configuration item {"+
              ["itemid","hostid","key_"].reduce((acc, key)=> acc.concat(key,": ",item[itemsOffsets[key]],", "),"")+
              "} at Zabbix Server "+zabbix.name+". Configuration item is skipped.");
            // Then add configuration
            acc.push({
              itemid: item[itemidOffset],
              hostid: item[hostidOffset],
              dbName,
              timers: Configurator.groupParamsByTime({params: this.parseXMLConfig({xml: item[paramsOffset]})})
            })
          }catch(e){
            console.warn(e.message,e);
          }
          return acc;
        }
      ,[]);
    });
    return this.getMonitorConfig();
  }

}


module.exports = Configurator;