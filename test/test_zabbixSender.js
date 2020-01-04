'use strict';
const Configurator = require('../libs/configurator');
const Sender = require('../libs/configurator/zabbixSender');
const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();

chai.use(require('chai-as-promised'));

describe("Тестируем zabbixSender",function(){

  let configurator;
  it("инициализует конфигурацию: считывает из файла", ()=>{
    configurator = new Configurator();
  });

  let zabbixConf;
  it("ищет конфигурацию подключения к Zabbix Server",()=>{
    zabbixConf = configurator.zabbixes[0];
  });

  describe("Проверяем реакцию на отсутствие коннекта к серверу: кривой порт",()=>{
    let sender;
    it("создает новый sender из конфигурации подключения, модифицируя порт на 'левый'",()=>{
      const zbxConf = JSON.parse(JSON.stringify(zabbixConf)); // make full copy of object
      zbxConf.port = 65532;
      sender = new Sender(zbxConf);
    });

    it("пытается послать разную хрень на сервер и получает отлуп",()=>{
      return expect(sender.send({hello:"hello"})).to.be.eventually.rejectedWith(Error,/(Abort connecting to Zabbix Server|ECONNREFUSED)/);     
    });

    it("пытается запросить конфигурацию с несуществующего Zabbix Server и также получает отлуп",() => {
      return expect(sender.requestConfig()).to.be.eventually.rejectedWith(Error,/(Abort connecting to Zabbix Server|ECONNREFUSED)/);      
    });
  });


  describe("Проверяем реакцию на отсутствие коннекта к серверу: кривой host",()=>{
    let sender;
    it("создает новый sender из конфигурации подключения, модифицируя host на 'левый'",()=>{
      const zbxConf = JSON.parse(JSON.stringify(zabbixConf)); // make full copy of object
      zbxConf.host = 'localhost';
      sender = new Sender(zbxConf);
    });

    it("пытается послать разную хрень на сервер и получает отлуп",()=>{
      return expect(sender.send({hello:"hello"})).to.eventually.be.rejectedWith(Error,/(Abort connecting to Zabbix Server|ECONNREFUSED)/);     
    });

    it("пытается запросить конфигурацию с несуществующего Zabbix Server и также получает отлуп",() => {
      return expect(sender.requestConfig()).to.eventually.be.rejectedWith(Error,/(Abort connecting to Zabbix Server|ECONNREFUSED)/);
    });
  });





})
