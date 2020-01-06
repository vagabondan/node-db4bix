# node-db4bix

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/vagabondan/node-db4bix/Node%20CI?style=plastic)
![Docker Cloud Automated build](https://img.shields.io/docker/cloud/automated/vagabondan/db4bix?style=plastic)
![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/vagabondan/db4bix?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/vagabondan/node-db4bix)
![GitHub repo size](https://img.shields.io/github/repo-size/vagabondan/node-db4bix)
![GitHub](https://img.shields.io/github/license/vagabondan/node-db4bix)
![GitHub package.json version](https://img.shields.io/github/package-json/v/vagabondan/node-db4bix)

Nodejs-rewritten DB monitoring plugin for [Zabbix](https://www.zabbix.com/).

It is evolution of [DBforBIX by SmartMarmot](https://github.com/smartmarmot/DBforBIX) and [DBforBIX by Vagabondan](https://github.com/vagabondan/DBforBIX) that were written in Java earlier.

## Features

- Configuration is through ***Zabbix Web Interface***
- ***Zabbix Preprocessing*** support!
- ***Whole table of items with only one SELECT***: your databases remain in rest
- ***Connection pooling*** control: no reconnection DDoS from monitoring
- ***Several Zabbix Server instances*** support at a time
- ***Zabbix templates*** for every supported DB type
- Resolves ***Zabbix Host/Templates macros*** (i.e. ``{$DSN}, {$ANY_OTHER_STUFF}``, etc.)
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
      - [XML syntax of Zabbix configuration items](#xml-syntax-of-zabbix-configuration-items)
  - [How it works alltogether](#how-it-works-alltogether)

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

1. Create or download simple [*docker-compose.yml*](https://raw.githubusercontent.com/vagabondan/node-db4bix/master/docker-compose.yml) directly:
   >     wget https://raw.githubusercontent.com/vagabondan/node-db4bix/master/docker-compose.yml
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

DB4bix configuration is divided in two main parts described below:

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

Being connected to Zabbix Server DB4bix requests all configuration for its Zabbix Proxy name (it performs this action periodically according to parameter *updateConfigPeriod* defined at *Global* section of local DB4bix config file).
It scans enabled hosts items for item keys ending with *DB4bix.config* (or what you have defined in *configSuffix* parameter under Zabbix section in local db4bix config file). You can specify any other config suffix in local DB4bix config at will, but important is to keep in mind that this suffix should uniquely identify items where DB4bix will search its configuration.

This Zabbix item keys (we will name it *configuration item key*) should also have 2 parameters and look like this:
>     .*DB4bix.config[someid,DBName]
where
*someid* - some your identifier (whatever you want),
*DBName* - DB name which should be present in local configuration file in *dbs[]* parameter under Zabbix section. It also may be a macro (we often use {$DSN} macro in our templates), then its value should be defined in host or template macros. Db4bix will resolve it prior to look for corresponding DB name at local config file.

Configuration items, i.e. those having item keys with .*DB4bix.config  suffix should be of type **Database monitor** and contain DB4bix-like XML configuration in ***SQL query field***, e.g.:

1. MySQL example where simple request returns result to single item key *mysql.DB4bix.config[version,MySQL01]*:
  >     <parms type="mysql" prefix="mysql.">
  >       <server>
  >         <query time="600" item="DB4bix.config[version,MySQL01]">SHOW VARIABLES LIKE "version"</query>
  >       </server>
  >     </parms>
2. Another example for Oracle DB of ***Zabbix discovery*** item with item key:
  >     oracle.discovery.DB4bix.config[instanceid,{$DSN]
It returns several results in one bulk request and has Zabbix host macro {$DSN} which value is defined at host macros with DB name of one of the databases defined at local DB4bix config file:
  >     <parms type="oracle" prefix="oracle.">
  >     <server>
  >     <discovery time="120" item="discovery.DB4bix.config[instanceid,{$DSN}]" names="INST_ID">select inst_id from gv$instance</discovery>
  >     <query time="60" item="stats[%1,%2]">SELECT inst_id, REPLACE(name,' ','_'), value FROM gv$sysstat WHERE name IN ('user I/O wait time','physical read total bytes','physical write total bytes','lob reads','lob writes','db block changes','db block gets','consistent gets','physical reads')</query>
  >     </server>
  >     </parms>
3. Many other examples you can find at Zabbix templates provided with this repo in *./templates* subdirectory.

You can place in SQL field of DBforBix config item full XML config with root element - parms. You can make it as complex as you wish. DB4bix creates as many async code flows as needed to serve all config items and avoid mutual influence of different config items.

Final step you should do is to create *items-receivers of data*. We recommend to use type *trappers* for them but this is not necessary.

For second example above you should create item prototypes with keys, e.g.:
>     oracle.stats[{#INST_ID},user_I/O_wait_time] 
>     oracle.stats[{#INST_ID}physical_read_total_bytes] 
>     ...
>     oracle.stats[{#INST_ID},physical_write_requests_optimized]

#### XML syntax of Zabbix configuration items

Two examples of XML syntax you've already seen [earlier](#xml-syntax-of-zabbix-configuration-items).
Below is the table with all possible elements and attributes of XML configuration items.

<table style='table-layout:auto;width:100%;'>
<thead >
<tr >
<th >Element</th>
<th >Attribute</th>
<th align="center">Examples</th>
<th>Description</th>
</tr>
</thead>

<tbody>

<tr>
<td rowspan="2"><em>parms</em></td>
<td><em>type</em></td>
<td align="center" rowspan="2">
<pre>
&lt;parms type="mysql" prefix="mysql."&gt;...&lt;/parms&gt;
&lt;parms prefix="mysql."&gt;...&lt;/parms&gt;
&lt;parms prefix="oracle."&gt;...&lt;/parms&gt;
&lt;parms prefix="whateveryouwant."&gt;...&lt;/parms&gt;
&lt;parms prefix=""&gt;...&lt;/parms&gt;
</pre>
</td>
<td>(Deprecated) Used in previous versions of DB4bix. Left for backward compatibility only and can be omitted.</td>
</tr>

<tr>
<td><em>prefix</em></td>
<td>You can define prefix which will be used as prefix for item keys where Db4bix will return results to. Or you can leave it empty as in last example.</td>
</tr>

<tr>
<td><em>server</em></td>
<td><em>type</em></td>
<td align="center">
<pre>
&lt;parms prefix=""&gt;
<strong>&lt;server&gt;</strong>
...
<strong>&lt;/server&gt;</strong>
&lt;/parms&gt;
</pre>
</td>
<td>Used in previous versions of DB4bix. Left for backward compatibility only. Should be present.</td>
</tr>

<tr>
<td rowspan="4"><em>query</em><br>
or<br>
<em>multiquery</em>
</td>
<td><em>time</em></td>
<td align="left" rowspan="4">
<pre>
&lt;parms prefix="mysql."&gt;&lt;server&gt;<br>

<strong>&lt;query time="60" item="</strong>one<strong>"&gt;</strong><br>select 1<br><strong>&lt;/query&gt;</strong>

<strong>&lt;multiquery time="60" item="</strong>anotherone<strong>"&gt;</strong><br>select 1<br><strong>&lt;/multiquery&gt;</strong>

<strong>&lt;query time="120" item="</strong>oneorzero<strong>" nodata="0"&gt;</strong><br>select 1<br><strong>&lt;/query&gt;</strong>

<strong>&lt;query time="60" item="</strong>one|two|three<strong>"&gt;</strong><br>select 1, 2, 3<br><strong>&lt;/query&gt;</strong>

<strong>&lt;query time="60" item="</strong>sameone|sametwo|samethree<strong>" type="column"&gt;</strong><br>select 1, 2, 3<br><strong>&lt;/query&gt;</strong>

<strong>&lt;query time="60" items="</strong>var1|var2<strong>" type="list"&gt;</strong><br>show variables<br><strong>&lt;/query&gt;</strong>

<strong>&lt;query time="60" items="</strong>variable[<strong>%1</strong>]<strong>" type="column"&gt;</strong><br>show variables<br><strong>&lt;/query&gt;</strong>

<strong>
&lt;query time="60" item="</strong>somekey[<strong>%1,%2</strong>]<strong>"&gt;</strong><br>SELECT inst_id, REPLACE(name,' ','_'), value <br>FROM stat_table <br>WHERE name IN ('user I/O wait time',<br>'physical read total bytes','physical write total bytes',<br>'consistent gets','physical reads')<br><strong>&lt;/query&gt;
</strong>

&lt;/server&gt;&lt;/parms&gt;
</pre>
</td>
<td>Time interval in seconds between consequent requests to DB with this query.</td>
</tr>

<tr>
<td><em>item</em><br>or<br><em>items</em></td>
<td>
<em>item</em> or <em>items</em> - are absolutely identical synonyms of attribute that holds Zabbix Item key or list of item keys separated with "|" (vertical line) where DB4bix should return results to.
Final Zabbix item key will be constructed using <em>prefix</em> attribute value from <em>parms</em> element. So for attribute <em>item</em> with value <em>"one|two|three"</em> DB4bix will be looking for Zabbix items with keys <em>mysql.one, mysql.two and mysql.three</em> to return values to them. The mentioned above item keys should be presented on the <strong>same Zabbix Host where current configuration item resides</strong>.
<br>There is some extention to this syntax: one can use placeholders (%1, %2, %3, ...) to construct item keys from data returned by query, e.g.
item="somekey[%1,%2]" - means that DB4bix should construct item keys getting values from first column for <em>%1</em> placeholder and from second column for <em>%2</em> placeholder from query resut and use last column as the value for this item keys.
If a query returns multiple rows then DB4bix constructs item keys by substituting placeholders per each row and as many times as many rows returned by the query.
<br>Most efficient queries come up when one combines placeholders and list syntax, e.g.
item="somekey1[%1,%2]|somekey2[%1,%2]|somekey3[%1,%2]|somekey4[%1,%2]" - this means that query may return any number of rows with 2 (placeholders) + 4 (values for 4 keys) = 7 columns per each row. Suppose query returns 100 rows, so one can get values for 4 (keys) * 100 (rows) = <strong>400 (items) with only one request to database!</strong> The whole tables are inserted to Zabbix per single query to database!
</td>
</tr>

<tr>
<td><em>type</em></td>
<td><em>column</em> (default)  or <em>list</em> - parse type of returning results when several item values from returned from single query/multiquery.<br>
Type <em>column</em> means that item values are returned in columns and they will be matched to their keys from the last column to the first column, i.e. last column corresponds to the last item key in <em>item</em> attribute, previous column corresponds to the previous item key and so on. If the number of columns is less than the number of item keys, the remaining item keys are ignored and vice versa.
Type <em>list</em> means, that query returns multiple rows with two columns where the first column corresponds to the key and the second column corresponds to the value, i.e. query returns <em>list</em> of key-value pairs. So <em>query</em> element in this case behaves like filter: only keys that matches to item keys in <em>item</em> attribute will be returned.</td>
</tr>

<tr>
<td><em>nodata</em></td>
<td>(Optional) What DB4bix should return if no data will be returned by query.</td>
</tr>

<tr>
<td rowspan="3"><em>discovery</em>
</td>
<td><em>names</em></td>
<td align="left" rowspan="3">
<pre>
&lt;parms prefix="oracle."&gt;&lt;server&gt;
<strong>
&lt;discovery <br>time="</strong>120<strong>" <br>item="</strong>discovery.DB4bix.config[instanceid,{$DSN}]<strong>" <br>names="INST_ID"&gt;</strong><br>select inst_id from gv$instance<br><strong>&lt;/discovery&gt;</strong><br>
&lt;query time="60" item="stats[%1,%2]"&gt;<br>SELECT inst_id, REPLACE(name,' ','_'), value <br>FROM gv$sysstat <br>WHERE name IN ('user I/O wait time','physical read total bytes',<br>'physical write total bytes','lob reads','lob writes',<br>'db block changes','db block gets','consistent gets',<br>'physical reads')<br>&lt;/query&gt;<br>
&lt;/server&gt;&lt;/parms&gt;
</pre>
</td>
<td>
Discovery elements behaves almost same as query but with major difference: it should return to Zabbix Server JSON LLD (Low Level Discovery) structure. This structure contains information about all possibles values of so called [Zabbix LLD Macros](https://www.zabbix.com/documentation/4.4/manual/config/macros/lld_macros). DB4bix constructs this structures for you, but you should identify list of such LLD Macros in attribute <em>names</em>.
You can use "|" (vertical line) symbol to construct list of LLD macros but remember that <strong>the number of columns returned by the query should correspond to the number of LLD macros</strong>. Number of rows is not limited but each row should contain unique combination of macros values or Zabbix will report "duplication" error to you.
Another constraint: LLD macros names should be in upper case and may contain only letters and underscore symbols.<br>
Please note, <strong>it is very convenient to use discovery items as configuration items for DB4bix!</strong> Do not forget to choose Zabbix item type as "Database monitor", because only this type contains "params" field in its userform, where you can type and edit DB4bix configuration.
</td>
</tr>

<tr>
<td><em>item</em></td>
<td>Should contain item key for discovery item. As you can see from example you are allowed to use [Zabbix User Macros](https://www.zabbix.com/documentation/4.4/manual/config/macros/usermacros) in item keys. They will be substituted by DB4bix prior to return values to Zabbix.</td>
</tr>

<tr>
<td><em>time</em></td>
<td>Same as for <em>query</em> elements, see above.</td>
</tr>

</tbody>
</table>



## How it works alltogether

Local file config (*db4bix.conf*) defines which Zabbix Servers DB4bix may connect to. Also it defines how DB4bix may connect to databases which it can monitor.
DB4bix connects to Zabbix Server like an ordinary Zabbix Proxy. 
Of course for it may be possible, corresponding Zabbix Proxy name should be defined at Zabbix Server and DB4bix should know this name too. This is the reason why you have to define *proxyName* parameter inside [*Zabbix*.Name] section of *db4bix.conf*.

**TBD**
