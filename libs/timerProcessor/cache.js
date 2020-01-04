class Cache{

    constructor(){
      Object.assign(this,{
        cache: {}
      })
    }
  
    add(key,data){
      this.cache[key] = data;
      return this.cache[key];
    }

    get(key){
      return this.cache[key];
    }
  
  }
  
  module.exports = Cache;