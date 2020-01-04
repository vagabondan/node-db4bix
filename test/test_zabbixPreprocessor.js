'use strict';
const zabbixPreprocessor = require('../libs/zabbixPreprocessor');
const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();

//chai.use(require('chai-as-promised'));

describe("Тестируем zabbixPreprocessor",function(){

  const zbxPreproc = new zabbixPreprocessor();
  
  it("Тестирует домножение",() => {
    let [
      itemValue, clock, ns, itemValueType, 
      opType, opParams, opErrorHandler, opErrorHandlerParams, 
      historyValue, historyClock, historyNs ] = [
      '4800',    1577967864, 956000000, 0,
      1,         '-3',      0,         '',
      '',        '',      ''
    ];
    expect(zbxPreproc.preprocess([itemValue, clock, ns, itemValueType, 
      opType, opParams, opErrorHandler, opErrorHandlerParams, 
      historyValue, historyClock, historyNs])).to.be.equal('-14400');
  })

  const [
    itemValue, clock, ns, itemValueType, 
    opType, opParams, opErrorHandler, opErrorHandlerParams, 
    historyValue, historyClock, historyNs ] = [
      '100',  1577976879,       340000000, 0,
      9,         '',        0,         '',
      '1',        1577976800,        ''
  ];
  it("Тестирует простое изменение с корректными параметрами",() => {
    // ZBX_PREPROC_DELTA_VALUE
    expect(zbxPreproc.preprocess([
      itemValue, clock, ns, itemValueType, 
      opType, opParams, opErrorHandler, opErrorHandlerParams, 
      historyValue, historyClock, historyNs])).to.be.equal('99');
  })

  const emptyHistoryValue = '';
  it("Тестирует простое изменение с пустым history_value",() => {
    // ZBX_PREPROC_DELTA_VALUE
    expect(() => zbxPreproc.preprocess([
      itemValue, clock, ns, itemValueType, 
      opType, opParams, opErrorHandler, opErrorHandlerParams, 
      emptyHistoryValue, historyClock, historyNs])).to.throw(TypeError,/history_value should be a nonempty String/);
  })

  const emptyHistoryClock = '';
  it("Тестирует простое изменение с пустым history_ts.sec",() => {
    // ZBX_PREPROC_DELTA_VALUE
    expect(() => zbxPreproc.preprocess([
      itemValue, clock, ns, itemValueType, 
      opType, opParams, opErrorHandler, opErrorHandlerParams, 
      historyValue, emptyHistoryClock, historyNs])).to.throw(TypeError,/history_ts.sec should be a Number/);
  })

  const zeroHistoryClock = 0;
  it("Тестирует простое изменение с нулевым history_ts.sec",() => {
    // ZBX_PREPROC_DELTA_VALUE
    expect(() => zbxPreproc.preprocess([
      itemValue, clock, ns, itemValueType, 
      opType, opParams, opErrorHandler, opErrorHandlerParams, 
      historyValue, zeroHistoryClock, historyNs])).to.throw(TypeError,/history_ts.sec should be greater than 0/);
  })

})
