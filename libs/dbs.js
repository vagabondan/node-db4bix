const fs = require('fs');
const path_module = require('path');
const debug = require('debug')("db4bix:dbs");
debug('Init');
const module_holder = {};

function LoadModules(path) {
  const stat = fs.lstatSync(path);
  if (stat.isDirectory()) {
    // we have a directory: do a tree walk
    const files = fs.readdirSync(path);
    let f, l = files.length;
    for (let i = 0; i < l; i++) {
      f = path_module.join(path, files[i]);
      LoadModules(f);
    }
  } else {
    // we have a file: load it
    require(path)(module_holder);
  }
}
let DIR = path_module.join(__dirname, 'db-plugins');
LoadModules(DIR);

exports.module_holder = module_holder;

const Date = require('./utils/date');
const msleep = require('./utils/sleep').msleep;

class DB{

  constructor({conf}){
    Object.assign(this,{
      conf,
      connector: module_holder[conf.type]()
    });
  }

  async init(){
    await this.connector.init({conf: this.conf});
  }

  async query(q){
    /*
    if(q.includes("DISTINCT")){
      debug("[" + new Date().toISOLocalDateTime() + "]: "+ q);
      await msleep(14000);
    }else{
      const time = Math.random()*45000 +5000;
      await msleep(time);
    }
    */
    return this.connector.query(q);
  }

  close(){
    this.connector.close();
  }

}

module.exports = DB;