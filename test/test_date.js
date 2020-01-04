'use strict';

require('../libs/utils/date');
const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();

chai.use(require('chai-as-promised'));

describe("Тестируем модуль utils/date.js",function(){

    it("Date возвращает время в ISO формате",()=>{
        console.log(new Date().toISOLocalDateTime());     
    });
    
    it("Date возвращает время в формате {clock, ns}",()=>{
        console.log(new Date().getClockNs());     
    });
})
