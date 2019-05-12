

class Storage{

  constructor(){
    Object.assign(this,{
      storage: []
    })
  }

  async push(data){
    this.storage.push(data);
  }

  async popAll(){
    const result = this.storage;
    this.storage = [];
    return result;
  }

}

module.exports = Storage;