'use strict';
const zbxp = require('bindings')('db4bix_preproc');
const debug = require('../utils/debug-vars')('ZabbixPreprocessor');
debug.debug('Init');


class ZabbixPreprocessor{
    /**
     * 
     * @param {[]} param0 - [itemValue, clock, ns, itemValueType, 
     * opType, opParams, opErrorHandler, opErrorHandlerParams, 
     * historyValue, historyClock, historyNs]
     */
    preprocess([itemValue, clock, ns, itemValueType, opType, opParams, opErrorHandler, opErrorHandlerParams, historyValue, historyClock, historyNs]){
        let result = undefined;
        //try{
            result = zbxp.preproc(itemValue.toString(), clock, ns, itemValueType, 
            opType, opParams, opErrorHandler, opErrorHandlerParams, historyValue, historyClock, historyNs);
        //}catch(e){
        //    debug.error(e);
        //    throw(e);
        // }
        return result;
    }
}

module.exports = ZabbixPreprocessor;