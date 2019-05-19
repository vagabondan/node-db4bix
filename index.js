'use strict';
const Processor = require('./libs/timerProcessor');
const debug = require('debug')("db4bix:index");
debug('Init');


( async ()=>{
  const processor = new Processor();
  processor.init();

})();
