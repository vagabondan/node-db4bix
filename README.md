![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vagabondan/node-db4bix/Node%20CI?style=plastic)
![Docker Cloud Automated build](https://img.shields.io/docker/cloud/automated/vagabondan/db4bix?style=plastic)
![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/vagabondan/db4bix?style=plastic)

# node-db4bix

DB moniotoring plugin for Zabbix rewritten in Node.js

Compatible with Zabbix 4.2.4 and higher.

It is evolution of [DBforBIX by SmartMarmot](https://github.com/smartmarmot/DBforBIX) and [DBforBIX by Vagabondan](https://github.com/vagabondan/DBforBIX) that were written in Java.

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

## With docker-compose

1. Create or download simple [*docker-compose.yml*](https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/docker-compose.yml) directly:
   >     wget https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/docker-compose.yml
   or just clone the whole repo and go inside created folder:
   >     git clone https://github.com/vagabondan/node-db4bix.git && cd node-db4bix
2. Create appropriate *db4bix.conf* configuration file inside *./config* subdirectory, [see example](https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/config/db4bix_sample.conf):
   >     mkdir ./config && vi ./config/db4bix.conf
3. Run:
   >     docker-compose up -d

You can choose appropriate debug level under *environment* section in docker-compose.yml by setting DEBUG variable. By default, it is set to *info* level.

## With docker

1. Create appropriate *db4bix.conf* configuration file inside */path/to/config* directory, [see config file example](https://github.com/vagabondan/node-db4bix/blob/64e62da009d3b2b09f2ca9fbbaee183974f9da2a/config/db4bix_sample.conf):
   >     vi /path/to/config/db4bix.conf
2. Run docker:
   >     docker run -d -v /path/to/config:/app/config vagabondan/db4bix
   or with full DEBUG messages:
   >     docker run -d -v /path/to/config:/app/config -e 'DEBUG=*' vagabondan/db4bix

## How to read logs with docker-compose

Read logs with command (from directory with *docker-compose.yaml* file):
   >     docker-compose logs -f db4bix

## How to read logs with docker

Do it with container id:
   >     docker logs -f <container_id>
   you can get container id with command:
   >     docker ps|grep db4bix
   this should read something like this:
   >     fd4c14dba6f6        vagabondan/db4bix   "docker-entrypoint.s…"   5 seconds ago       Up 3 seconds                                 silly_mclean
   where the first hexademical identifier *fd4c14dba6f6* is the container id.

## Choose log verbosity

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

   