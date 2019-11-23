const mysql = require('mysql');
const util = require('util');
const assert = require('assert');
const debug = require('debug')("db4bix:mysql");
debug('Init');

class Mysql{

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
      host: conf.host,
      port: conf.port,
      database: conf.database,
      // pool options
      connectionLimit: parseInt(conf.pool.max), // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      acquireTimeout: parseInt(conf.pool.connectionTimeoutMillis), // terminate getConnection() calls in the queue longer than 60000 milliseconds
    };
    try{
      this.pool = mysql.createPool(this.conf);
    }catch(err){
      console.error(err);
      throw(err); 
    }
    debug("Connection pool started");
  }

  close(){
    // Get the pool from the pool cache and close it when no
    // connections are in use, or force it closed after 10 seconds
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file
    const conf = this.conf;
    const pool = util.promisify(this.pool.end.bind(this.pool));
    pool.end()
    .then(() => debug('Pool closed'))
    .catch(e => console.error("Error while closing connection to Mysql DB "+
      JSON.stringify({name: conf.name, host: conf.host, port: conf.port, database: conf.database}),
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
    assert.ok(this.pool,`Connection pool for DB ${this.conf.name} hasn't been initialized yet!`);
    let connection;
    let result = undefined;
    try{
      const getConnection = util.promisify(this.pool.getConnection.bind(this.pool));
      connection = await getConnection();
      const query = util.promisify(connection.query.bind(connection));
      result = await query(q);
    }catch(err){
      console.error(`Error executing query ${q} on DB ${this.conf.name}`,err);
      throw(err);
    }finally{
      try{
        connection.release();
      }catch(err){
        console.error(`Error releasing connection to DB ${this.conf.name}`,err);
      }
    }

    // we have to flatten all agregations by column names if any
    return result.map(
      (row) => Object.keys(row).reduce(
        (acc, key) => acc.concat(row[key]),
        []
      ).map( c => {
        try{
          return c.trim();
        }catch(e){
          debug("Error on trimming value "+c+": "+e.message);
          return c;
        }
      })
    );
  }

}

module.exports = Mysql;