const fs = require('fs');
const path_module = require('path');
const assert = require('assert');
const debug = require('../utils/debug-vars')('DBs');
debug.debug('Init');
/**
 * module_holder is the object with name:DB_type_instance
 */
const module_holder = {};

function LoadModules(path) {
  /**
   * Recursively walks through all 'path' subdirs and loads all modules within it 
   */
  const stat = fs.lstatSync(path);
  if (stat.isDirectory()) {
    // get directory entries
    const files = fs.readdirSync(path);

    // if directory contains index.js file
    if( Array.isArray(files) && files.includes('index.js')){
      // assume directory to be package
      // we have a file: load it to the module_holder
      const dbModule = require(path);
      // alias => DB type
      const alias = path_module.basename(path);
      // the key in this dictionary can be whatever you want
      // just make sure it won't override other modules
      // TODO implement name conflict resolving!
      module_holder[alias] = new dbModule();
    }else{
      // do a tree walk
      let f, l = files.length;
      for (let i = 0; i < l; i++) {
        f = path_module.join(path, files[i]);
        LoadModules(f);
      }
    }
  } else {
    // we have a file: load it to the module_holder
    const dbModule = require(path);
    const extension = path_module.extname(path);

    // alias => DB type
    const alias = path_module.basename(path,extension);

    // the key in this dictionary can be whatever you want
    // just make sure it won't override other modules
    // TODO implement name conflict resolving!
    module_holder[alias] = new dbModule();
  }
}
let DIR = path_module.join(__dirname, 'db-plugins');
LoadModules(DIR);

exports.module_holder = module_holder;

const Date = require('../utils/date');
const msleep = require('../utils/sleep').msleep;

class DB{

  constructor({conf}){
    assert.ok(Object.keys(module_holder).some(k => k === conf.type),"No plugin found for DB type "+
      conf.type+"! Maybe it is not supported yet? Complete list of all supported types: "+
      JSON.stringify(Object.keys(module_holder)));
    Object.assign(this,{
      conf,
      connector: module_holder[conf.type]
    });
    debug.debug(`DB ${this.conf.name} of type ${this.conf.type} has been loaded.`);
  }

  async init(){
    await this.connector.init({conf: this.conf});
    debug.debug(`DB ${this.conf.name} has been inited.`);
  }

  async query(q){
    /*
    if(q.includes("DISTINCT")){
      debug.debug("[" + new Date().toISOLocalDateTime() + "]: "+ q);
      await msleep(14000);
    }else{
      const time = Math.random()*45000 +5000;
      await msleep(time);
    }
    */
    return await this.connector.query(q);
  }

  close(){
    this.connector.close();
  }

}

module.exports = DB;