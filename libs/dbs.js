const fs = require('fs');
const path_module = require('path');
const module_holder = {};

function LoadModules(path) {
  fs.lstat(path, function(err, stat) {
    if (stat.isDirectory()) {
      // we have a directory: do a tree walk
      fs.readdir(path, function(err, files) {
        let f, l = files.length;
        for (let i = 0; i < l; i++) {
          f = path_module.join(path, files[i]);
          LoadModules(f);
        }
      });
    } else {
      // we have a file: load it
      require(path)(module_holder);
    }
  });
}
let DIR = path_module.join(__dirname, 'dbs');
LoadModules(DIR);

exports.module_holder = module_holder;



class DB{
  constructor({db}){
    const connection = {};
    Object.assign(this,{
      config: db,
      connection
    });
  }

  init(){
    this.connection = new module_holder[this.config.type]({config: this.config});
  }



}

module.exports = DB;