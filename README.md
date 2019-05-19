# node-db4bix

DB moniotoring plugin for Zabbix rewritten in Node.js

Compatible with Zabbix 3.4.12 and higher.

It is evolution of [DBforBIX by SmartMarmot](https://github.com/smartmarmot/DBforBIX) and [DBforBIX by Vagabondan](https://github.com/vagabondan/DBforBIX) that were written in Java.

It will support at least MySQL, Oracle, MSSQL, Postgres... and you can easily extend this list, see ./libs/db-plugins 

But now it supports only MSSQL because we need it first.

Configuration syntax in Zabbix stays untouched, but we will extend it too...

Local configuration file is changed drastically and has now ini-format.

Some help of configuration one can read [here](https://github.com/vagabondan/DBforBIX/wiki), but ignore local file configuration instructions, I'll update them a bit later here.