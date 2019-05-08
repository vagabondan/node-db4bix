'use strict';
const Processor = require('./libs/timerProcessor');
const debug = require('debug')("db4bix:index");
debug('Init');


( async ()=>{
  const processor = new Processor();
  processor.init();

  /*
  response = await  sender.sendHistoryData({
    "12551681": [
        {"{#DATABASE}":"UiPath"}
      ]
    ,
  });
  debug(response)
  */
})();

//sender.sendd({"somekey": 42}); //if you prefer