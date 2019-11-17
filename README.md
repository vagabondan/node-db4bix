# node-db4bix

DB moniotoring plugin for Zabbix rewritten in Node.js

Compatible with Zabbix 4.2.4 and higher.

It is evolution of [DBforBIX by SmartMarmot](https://github.com/smartmarmot/DBforBIX) and [DBforBIX by Vagabondan](https://github.com/vagabondan/DBforBIX) that were written in Java.

It will support at least MySQL, Oracle, MSSQL, Postgres... and you can easily extend this list, see ./libs/db-plugins 

Support DB progress:
- MSSQL
- Postgres

Configuration syntax in Zabbix stays untouched, but we will extend it too...

Local configuration file is changed drastically and has now ini-format.

Some help of configuration one can read [here](https://github.com/vagabondan/DBforBIX/wiki), but ignore local file configuration instructions there. Actual configuration sample is [here](https://github.com/vagabondan/node-db4bix/blob/master/config/db4bix_sample.conf).
