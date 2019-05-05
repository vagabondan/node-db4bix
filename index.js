const debug = require('debug')("db4bix:index");
debug('Init');
const Sender = require('./libs/zabbixSender');
const Processor = require('./libs/mainProcessor');

const config = require('./libs/configurator');


( async ()=>{
  let response;
  await config.parseConfigsFromZabbix();

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