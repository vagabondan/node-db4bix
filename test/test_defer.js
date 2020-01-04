'use strict';

const defer = require('../libs/utils/defer');
const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();

chai.use(require('chai-as-promised'));

describe("Тестируем модуль utils/defer.js",function(){

    it("reject without parameters",()=>{
        let timeout = defer();
        setTimeout(timeout.reject, 100);
        return expect(timeout).to.be.eventually.rejectedWith(Error,"defer.reject");     
    });

    it("resolve without parameters",()=>{
        let timeout = defer();
        setTimeout(timeout.resolve, 100);
        return expect(timeout).to.be.eventually.fulfilled;     
    });

    it("reject with parameters",()=>{
        let timeout = defer(new Error("Test defer.reject"));
        setTimeout(timeout.reject, 100);
        return expect(timeout).to.be.eventually.rejectedWith(Error, "Test defer.reject");     
    });

    it("resolve with parameters",()=>{
        let timeout = defer(new Error("Test defer.resolve"));
        setTimeout(timeout.resolve, 100);
        return expect(timeout).to.be.eventually.fulfilled;     
    });


    it("reject through Promise.race",()=>{
        let timeout = defer(new Error("Test defer.reject"));
        setTimeout(timeout.reject, 100);

        let timeout1 = defer();
        setTimeout(timeout1.resolve, 500);

        return expect(Promise.race([timeout,timeout1])).to.be.eventually.rejectedWith(Error, "Test defer.reject");     
    });

    /*
    // TODO redesign test
    it("resolve through Promise.race",()=>{
        let timeout = defer(new Error("Test defer.resolve"));
        setTimeout(timeout.resolve, 100);
        
        let timeout1 = defer(new Error("Test defer.reject"));
        setTimeout(timeout1.reject, 500);
        
        return expect(Promise.race([timeout,timeout1])).to.be.eventually.fulfilled.and.then.rejectedWith(Error,"Test defer.reject");     
    });
    */
    

})
