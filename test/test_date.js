'use strict';

require('../libs/utils/date');
const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();

chai.use(require('chai-as-promised'));

describe("Тестируем модуль utils/date.js",function(){

    it("Date возвращает время в ISO формате",()=>{
        expect(new Date().toISOLocalDateTime()).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+0300/);     
    });
    
    it("Date возвращает время в формате {clock, ns}",()=>{
        const result = new Date().getClockNs();
        //expect(result).to.have.all.keys('clock', 'ns'); 
        expect(result).to.have.property('clock').match(/\d{10}/);
        expect(result).to.have.property('ns').match(/\d{9}/);
    });
})
