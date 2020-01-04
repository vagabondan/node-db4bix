![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vagabondan/node-db4bix/Node%20CI?style=plastic)
![Docker Cloud Automated build](https://img.shields.io/docker/cloud/automated/vagabondan/db4bix?style=plastic)
![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/vagabondan/db4bix?style=plastic)

# node-db4bix

DB moniotoring plugin for Zabbix rewritten in Node.js

Compatible with Zabbix 4.2.4 and higher.

It is evolution of [DBforBIX by SmartMarmot](https://github.com/smartmarmot/DBforBIX) and [DBforBIX by Vagabondan](https://github.com/vagabondan/DBforBIX) that were written in Java.

Features:
- Zabbix Preprocessing support!

DB support:

- MySQL
- Postgres
- Oracle
- MSSQL

We are planning to extend it to other DBs...

You can easily extend this list, see ./libs/dbs/db-plugins 

Configuration syntax in Zabbix stays untouched, but we will extend it too...

Local configuration file is changed drastically and has now ini-format.

Some help of configuration one can read [here](https://github.com/vagabondan/DBforBIX/wiki), but ignore local file configuration instructions, I'll update them a bit later here.

## Installation

### Direct Node.js

1. Download this repo:
   >     git clone https://github.com/vagabondan/node-db4bix.git
2. Go to downloaded repo dir
   >     cd node-db4bix
3. Install node packages:
   >     npm install
4. Run:
   >     node index.js
