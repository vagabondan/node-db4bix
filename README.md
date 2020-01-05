# node-db4bix

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vagabondan/node-db4bix/Node%20CI?style=plastic)
![Docker Cloud Automated build](https://img.shields.io/docker/cloud/automated/vagabondan/db4bix?style=plastic)
![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/vagabondan/db4bix?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/vagabondan/node-db4bix)
![GitHub repo size](https://img.shields.io/github/repo-size/vagabondan/node-db4bix)
![GitHub](https://img.shields.io/github/license/vagabondan/node-db4bix)
![GitHub package.json version](https://img.shields.io/github/package-json/v/vagabondan/node-db4bix)

DB moniotoring plugin for Zabbix rewritten in Node.js

Compatible with Zabbix 4.2.4 and higher.

It is evolution of [DBforBIX by SmartMarmot](https://github.com/smartmarmot/DBforBIX) and [DBforBIX by Vagabondan](https://github.com/vagabondan/DBforBIX) that were written in Java earlier.

Features:

- ***Zabbix Preprocessing*** support!

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

## Documentation

- [node-db4bix](#node-db4bix)
  - [Documentation](#documentation)
  - [Installation and run](#installation-and-run)
    - [With Node.js](#with-nodejs)
    - [With docker-compose](#with-docker-compose)
    - [With docker](#with-docker)
  - [Logs](#logs)
    - [How to read logs with docker-compose](#how-to-read-logs-with-docker-compose)
    - [How to read logs with docker](#how-to-read-logs-with-docker)
    - [Choose log verbosity](#choose-log-verbosity)
  - [Configuration](#configuration)
    - [Configuration file db4bix.conf](#configuration-file-db4bixconf)
    - [Zabbix Server configuration items](#zabbix-server-configuration-items)

## Installation and run

### With Node.js

1. Download this repo:
   >     git clone https://github.com/vagabondan/node-db4bix.git
2. Go to downloaded repo dir and install node packages:
   >     cd node-db4bix && npm install
3. Create appropriate *db4bix.conf* configuration file inside *./config* subdirectory:
   >     cp ./config/db4bix_sample.conf ./config/db4bix.conf && vi ./config/db4bix.conf
4. Run:
   >     node index.js
   or with full debug messages:
   >     DEBUG='*' node index.js

### With docker-compose

1. Create or download simple [*docker-compose.yml*](https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/docker-compose.yml) directly:
   >     wget https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/docker-compose.yml
   or just clone the whole repo and go inside created folder:
   >     git clone https://github.com/vagabondan/node-db4bix.git && cd node-db4bix
2. Create appropriate *db4bix.conf* configuration file inside *./config* subdirectory, [see example](https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/config/db4bix_sample.conf):
   >     mkdir ./config && vi ./config/db4bix.conf
3. Run:
   >     docker-compose up -d

You can choose appropriate debug level under *environment* section in docker-compose.yml by setting DEBUG variable. By default, it is set to *info* level.

### With docker

1. Create appropriate *db4bix.conf* configuration file inside */path/to/config* directory, [see config file example](https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/config/db4bix_sample.conf):
   >     vi /path/to/config/db4bix.conf
2. Run docker:
   >     docker run -d -v /path/to/config:/app/config vagabondan/db4bix
   or with full DEBUG messages:
   >     docker run -d -v /path/to/config:/app/config -e 'DEBUG=*' vagabondan/db4bix

## Logs

### How to read logs with docker-compose

Read logs with command (from directory with *docker-compose.yaml* file):
   >     docker-compose logs -f db4bix

### How to read logs with docker

Do it with container id:
   >     docker logs -f <container_id>
   you can get container id with command:
   >     docker ps|grep db4bix
   this should read something like this:
   >     fd4c14dba6f6        vagabondan/db4bix   "docker-entrypoint.s…"   5 seconds ago       Up 3 seconds                                 silly_mclean
   where the first hexademical identifier *fd4c14dba6f6* is the container id.

### Choose log verbosity

Log verbosity is managed with variable DEBUG.
It is set differently depending of what type of *db4bix* run you have chosen:

1. *Nodejs*: right in the command line of terminal where you start *db4bix*:
   >     DEBUG='*' node index.js
2. *docker-compose*: inside *docker-compose.yml* file under *environment* section of *db4bix* service.
3. *docker*: as the parameter to *docker run* command right after *-e* option:
   >     docker run -d -v /path/to/config:/app/config -e 'DEBUG=*' vagabondan/db4bix

Below are some examples of DEBUG variable with short explanations:

1. Show *all* messages from *all* modules (not only db4bix):
   >     DEBUG='*'
2. Show *debug* messages from only *db4bix* modules:
   >     DEBUG='db4bix:*'
3. Show only *info* messages from only *db4bix* modules:
   >     DEBUG='db4bix:*:info'
4. Show *all* messages from *ZabbixSender* module of *db4bix*:
   >     DEBUG='db4bix:ZabbixSender:*'
5. Show only *info* messages from *ZabbixSender* module of *db4bix*:
   >     DEBUG='db4bix:ZabbixSender:info'

## Configuration

DB4bix configuration is divided on two main parts described below:

1. [Configuration file: db4bix.conf](#configuration-file-db4bixconf)
2. [Zabbix Server configuration items](#zabbix-server-configuration-items)

### Configuration file db4bix.conf

We use *ini*-file format and syntax inside db4bix.conf which is described in details [here](https://www.npmjs.com/package/ini).

Configuration file keeps the following parameters listed in the table below:

| Parameter | Example | Section | Description |
| --- | :---: | --- | --- |
| ***updateConfigPeriod*** | updateConfigPeriod=30 | Global | time interval between consequent updating configuration from Zabbix Servers, in seconds |
| [***Zabbix***.*Name*] | [***Zabbix***.*Prod*]<br> [***Zabbix***.*Test*]<br> [***Zabbix***.*Srv01*] | Global | Section name for Zabbix server instance connection parameters. You can specify any number of different Zabbix Servers and they will be served by DB4bix independently and simultaneously. |
| ***host*** | ***host***=*zbxsrv01.yourdomain*<br>***host***=*192.168.2.1* | [***Zabbix***.*Name*] | FQDN or IP address of Zabbix server instance, described in current Zabbix section |
| ***port*** | ***port***=10051 | [***Zabbix***.*Name*] | Zabbix Server port |
| ***proxyName*** | ***proxyName***=*DB4bix.01* | [***Zabbix***.*Name*] | Name of Zabbix Proxy that should be defined at current Zabbix Server instance to allow DB4bix communicate with Zabbix Server. Proxy mode should be set to ***Active***. |
| ***timeoutMillis*** | ***timeoutMillis***=*10000* | [***Zabbix***.*Name*] | Network timeout for Db4bix to wait response from Zabbix Server |
| ***sendDataPeriod*** | ***sendDataPeriod***=*61* | [***Zabbix***.*Name*] | Time interval between consequent data sending actions to Zabbix Server. DB4bix keeps metrics from databases in local buffer and send bulk requests to Zabbix Server trappers with frequency configured with this parameter. |
| ***configSuffix*** | ***configSuffix***=*DB4bix.config* | [***Zabbix***.*Name*] | Zabbix Server item keys suffix where users expect to define DB4bix configuration on Zabbix Server Frontend side. This configuration should define SQL selects with some metadata for DB4bix to understand where it should put the resuts. See below section [Zabbix Server configuration items](#zabbix-server-configuration-items) for details.|
| ***version*** | ***version***=*4.2.4* | [***Zabbix***.*Name*] | Zabbix Server version for DB4bix to choose the right Zabbix internal protocol to communicate with Zabbix Server. For now only 4.2.4 and higher versions are supported. We haven't tested it with lower versions yet. |
| ***dbs[]*** | ***dbs[]*** = *DB01* <br> ***dbs[]*** = *DB02* <br> ***dbs[]*** = *DB03* <br> etc | [***Zabbix***.*Name*] | List of databases alowed to monitor with current Zabbix Server instance. Syntax expect to add to list one DB per row, so you might have to define several rows with ***dbs[]*** indide one Zabbix Server section |



### Zabbix Server configuration items

