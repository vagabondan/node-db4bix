'use strict';
const Processor = require('./libs/timerProcessor');
const debug = require('./libs/utils/debug-vars')('index');
debug.debug('Init');


( async ()=>{
  const processor = new Processor();
  processor.init();

})();
