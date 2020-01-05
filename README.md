# node-db4bix

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vagabondan/node-db4bix/Node%20CI?style=plastic)
![Docker Cloud Automated build](https://img.shields.io/docker/cloud/automated/vagabondan/db4bix?style=plastic)
![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/vagabondan/db4bix?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/vagabondan/node-db4bix)
![GitHub repo size](https://img.shields.io/github/repo-size/vagabondan/node-db4bix)
![GitHub](https://img.shields.io/github/license/vagabondan/node-db4bix)
![GitHub package.json version](https://img.shields.io/github/package-json/v/vagabondan/node-db4bix)

Nodejs-rewritten DB moniotoring plugin for [Zabbix](https://www.zabbix.com/).

It is evolution of [DBforBIX by SmartMarmot](https://github.com/smartmarmot/DBforBIX) and [DBforBIX by Vagabondan](https://github.com/vagabondan/DBforBIX) that were written in Java earlier.

## Features

- Configuration is through ***Zabbix Web Interface***
- ***Zabbix Preprocessing*** support!
- ***Whole table of items with only one SELECT***: your databases remain in rest
- ***Connection pooling*** control: no reconnection DDoS from monitoring
- ***Several Zabbix Server instances*** support at a time
- ***Zabbix templates*** for every supported DB type
- Compatible with ***Zabbix 4.2.4++***

## Supported DB types

- MySQL
- PostgreSQL
- Oracle
- MSSQL

We are planning to extend it to other DBs...

You can easily extend this list, see ./libs/dbs/db-plugins

## Documentation

- [node-db4bix](#node-db4bix)
  - [Features](#features)
  - [Supported DB types](#supported-db-types)
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

<table >
<thead >
<tr >
<th >Section</th>
<th >Parameter</th>
<th align="center" >Example</th>
<th>Description</th>
</tr>
</thead>




<tbody>

<tr>
<td rowspan="4">Global</td>
<td><em>updateConfigPeriod</em></td>
<td align="center">updateConfigPeriod=30</td>
<td>Time interval in seconds between consequent updating configuration from Zabbix Servers.</td>
</tr>

<tr>
<td>[<em>Zabbix</em>.Name]</td>
<td align="center">[Zabbix.Prod]<br> [Zabbix.Test]<br> [Zabbix.Srv01]</td>
<td>Section name for Zabbix server instance connection parameters. You can specify any number of different Zabbix Servers and they will be served by DB4bix independently and simultaneously.</td>
</tr>

<tr>
<td>[<em>DB</em>.Name]</td>
<td align="center">[DB.BillingProd]<br> [DB.PGTest]<br> [DB.CMDB]</td>
<td>Section name for Database instance connection parameters. You can specify any number of different databases.</td>
</tr>

<tr>
<td>[<em>Pool</em>.Name]</td>
<td align="center">[Pool.Common]<br> [Pool.OldDBs]<br> [Pool.TestDBs]</td>
<td>Section name for DB connection Pool configuration parameters. You can specify any number of different Pools. Pool names are then referenced in DB sections in <em>pool</em> parameters. Pools manage network connections from DB4bix to DB instances.</td>
</tr>



<tr>
<td colspan="4" align="center">[<strong>Zabbix</strong>.<em>Name</em>] section</td>
</tr>
<tr>
<td rowspan="8">[Zabbix.<em>Name</em>]</td>
<td><em>host</em></td>
<td align="center">host=zbxsrv01.yourdomain<br>host=192.168.2.1</td>
<td>FQDN or IP address of Zabbix server instance, described in current Zabbix section</td>
</tr>
<tr>
<td><em>port</em></td>
<td align="center">port=10051</td>

<td>Zabbix Server port</td>
</tr>
<tr>
<td><em>proxyName</em></td>
<td align="center">proxyName=DB4bix.01</td>

<td>Name of Zabbix Proxy that should be defined at current Zabbix Server instance to allow DB4bix communicate with Zabbix Server. Proxy mode should be set to <em><strong>Active</strong></em>.</td>
</tr>
<tr>
<td><em>timeoutMillis</em></td>
<td align="center">timeoutMillis=10000</td>

<td>Network timeout for Db4bix to wait response from Zabbix Server</td>
</tr>
<tr>
<td><em>sendDataPeriod</em></td>
<td align="center">sendDataPeriod=61</td>

<td>Time interval between consequent data sending actions to Zabbix Server. DB4bix keeps metrics from databases in local buffer and send bulk requests to Zabbix Server trappers with frequency configured with this parameter.</td>
</tr>
<tr>
<td><em>configSuffix</em></td>
<td align="center">configSuffix=DB4bix.config</td>

<td>Zabbix Server item keys suffix where users expect to define DB4bix configuration on Zabbix Server Frontend side. This configuration should define SQL selects with some metadata for DB4bix to understand where it should put the resuts. See below section <a href="#zabbix-server-configuration-items">Zabbix Server configuration items</a> for details.</td>
</tr>
<tr>
<td><em>version</em></td>
<td align="center">version=4.2.4</td>

<td>Zabbix Server version for DB4bix to choose the right Zabbix internal protocol to communicate with Zabbix Server. For now only 4.2.4 and higher versions are supported. We haven't tested it with lower versions yet.</td>
</tr>
<tr>
<td><em>dbs[]</em></td>
<td align="center">dbs[] = DB01 <br> dbs[] = DB02 <br> dbs[] = DB03 <br> etc</td>

<td>List of databases names allowed to monitor with current Zabbix Server instance. Syntax expects user to add to list one DB per row, so you might have to define several rows with <em>dbs[]</em> inside one Zabbix Server section</td>
</tr>




<td colspan="4" align="center">[<strong>DB</strong>.<em>Name</em>] section</td>
</tr>

<tr>
<td rowspan="8">[DB.<em>Name</em>]</td>
<td><em>type</em></td>
<td align="center">type=mssql<br>type=postgres<br>type=oracle<br>type=mysql</td>
<td>Defines which client driver will be used to establish connections to DB instance. There are slight differences in parameters for different DB types.</td>
</tr>

<tr>
<td><em>instance</em></td>
<td align="center">instance=BillingDB</td>
<td>DB instance name or SID for Oracle DB type. You should know that information from database administrators.</td>
</tr>

<tr>
<td><em>host</em></td>
<td align="center">host=billingdb.yourdomain<br>host=172.16.15.5</td>
<td>FQDN or IP address of a host of your DBMS.</td>
</tr>

<tr>
<td><em>port</em></td>
<td align="center">port=5432</td>
<td>Port for connection establish with your DBMS. If null or empty, default will be used for this type of DB.</td>
</tr>

<tr>
<td><em>user</em></td>
<td align="center">user=thom</td>
<td>Username/schemaname for your DB.</td>
</tr>

<tr>
<td><em>password</em></td>
<td align="center">password=your.supersecret.password</td>
<td>Password for user for your DB. Yes, keep open passwords in plain text is not very good idea. We will be glad to see more reasonable proposals or even PRs ;-)</td>
</tr>

<tr>
<td><em>pool</em></td>
<td align="center">pool=Common</td>
<td>Pool name which settings will be used to manage network connections from Db4bix to current DB.</td>
</tr>

<tr>
<td><em>connectString</em></td>
<td align="center">connectString=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=mymachine.example.com)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=orcl)))</td>
<td>[ORACLE only]: Connection string used to connect to Oracle DBs. Possible formats are described [here](https://oracle.github.io/node-oracledb/doc/api.html#-142-connection-strings)</td>
</tr>



<td colspan="4" align="center">[<strong>Pool</strong>.<em>Name</em>] section</td>
</tr>

<tr>
<td rowspan="8">[Pool.<em>Name</em>]</td>
<td><em>max</em></td>
<td align="center">max=10</td>
<td>Maximum number of concurrent connections that DB4bix can establish to each DB referencing this Pool.</td>
</tr>

<tr>
<td><em>min</em></td>
<td align="center">min=0</td>
<td>Minimum number of concurrent connections that DB4bix will keep open even if no activity with DB is planning.</td>
</tr>

<tr>
<td><em>idleTimeoutMillis</em></td>
<td align="center">idleTimeoutMillis=30000</td>
<td>Timeout in millisecconds after which DB4bix starts to terminate unused connections. Specific behaviour is defined by DB client library.</td>
</tr>

<tr>
<td><em>connectionTimeoutMillis</em></td>
<td align="center">connectionTimeoutMillis=30000</td>
<td>Timeout in millisecconds after which DB4bix reports unsuccessful connection attempt to DB. Specific behaviour is defined by DB client library.</td>
</tr>

<tr>
<td><em>keepAliveSec</em></td>
<td align="center">keepAliveSec=60</td>
<td>Period in seconds for sending keepalive request from DB4bix to DB. Some databases requires keepalive checks from clients.</td>
</tr>

</tbody>
</table>

### Zabbix Server configuration items

Some help of configuration one can read [here](https://github.com/vagabondan/DBforBIX/wiki), but ignore local file configuration instructions, I'll update them a bit later in this readme.
