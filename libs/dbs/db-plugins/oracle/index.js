const oracledb = require('oracledb');
const assert = require('assert');
const debug = require('../../../utils/debug-vars')('ORACLE');
debug.debug('Init');

class Oracle{

  constructor(){
    Object.assign(this,{
      pool: undefined,
      conf: undefined,
    })
  }

  async init({conf}){
    this.conf = {
      name: conf.name,
      user: conf.user,
      password: conf.password,
      connectString: conf.connectString || 
      `(DESCRIPTION = (ADDRESS=(PROTOCOL=tcp)(HOST=${conf.host})(PORT=${conf.port}))(CONNECT_DATA=(SID=${conf.instance})))`,

      // pool options
      homogeneous: true, // all connections in the pool have the same credentials
      poolAlias: 'default', // set an alias to allow access to the pool via a name.
      poolIncrement: 1, // only grow the pool by one connection at a time
      poolMax: parseInt(conf.pool.max), // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      poolMin: parseInt(conf.pool.min), // start with no connections; let the pool shrink completely
      poolPingInterval: parseInt(conf.pool.keepAliveSec), // check aliveness of connection if idle in the pool for 60 seconds
      poolTimeout: parseInt(conf.pool.idleTimeoutMillis), // terminate connections that are idle in the pool for 60 seconds
      queueTimeout: parseInt(conf.pool.connectionTimeoutMillis), // terminate getConnection() calls in the queue longer than 60000 milliseconds
      //stmtCacheSize: 30 // number of statements that are cached in the statement cache of each connection
    };
    try{
      this.pool = await oracledb.createPool(this.conf);
    }catch(err){
      debug.error(err);
      throw(err); 
    }
    debug.debug("Connection pool started");
  }

  close(){
    // Get the pool from the pool cache and close it when no
    // connections are in use, or force it closed after 10 seconds
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file
    const conf = this.conf;
    this.pool.close(10)
    .then(() => debug.debug('Pool closed'))
    .catch(e => debug.error("Error while closing connection to Oracle DB "+
      JSON.stringify({connectString: conf.connectString}),
      e
    ));
    this.pool = undefined;
  }

  /**
   *
   * @param q - query string
   * @returns Array of Arrays: [[c1,c2,...,cn],[c1,c2,...,cn],..., ] => dimension: rows x columns
   */
  async query(q){
    assert.ok(this.pool,`Connection pool for DB ${this.conf.name} (${this.conf.connectString}) hasn't been initialized yet!`);
    let client;
    let result = undefined;
    try{
      client = await this.pool.getConnection();
      result = await client.execute(q, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    }catch(err){
      debug.error(`Error executing query ${q} on DB ${this.conf.name}`,err);
      throw(err);
    }finally{
      try{
        await client.close();
      }catch(err){
        debug.error(`Error releasing connection to DB ${this.conf.name}`,err);
      }
    }

    // we have to flatten all agregations by column names if any
    return result.rows.map(
      (row) => Object.keys(row).reduce(
        (acc, key) => acc.concat(row[key]),
        []
      ).map( c => {
        try{
          return c.trim();
        }catch(e){
          debug.debug("Error on trimming value "+c+": "+e.message);
          return c;
        }
      })
    );
  }

}

module.exports = Oracle;