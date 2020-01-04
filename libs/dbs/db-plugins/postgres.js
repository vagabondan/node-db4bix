const {Pool} = require('pg');
const debug = require('../../utils/debug-vars')('PostgreSQL');
debug.debug('Init');

class Postgres{

  constructor(){
    Object.assign(this,{
      pool: undefined,
    })
  }

  async init({conf}){
    conf = {
        user: conf.user,
        password: conf.password,
        host: conf.host,
        port: conf.port,
        database: conf.instance,      
        min: parseInt(conf.pool.min),
        max: parseInt(conf.pool.max),
        idleTimeoutMillis: parseInt(conf.pool.idleTimeoutMillis),
        connectionTimeoutMillis: parseInt(conf.pool.connectionTimeoutMillis),
    };
    this.pool = new Pool(conf);
    this.pool.on('error', err => {
        debug.error("Connection error", err);
    });
  }

  close(){
    this.pool.end(()=>debug.debug("Pool has ended."));
    this.pool = undefined;
  }

  /**
   *
   * @param q - query string
   * @returns Array of Arrays: [[c1,c2,...,cn],[c1,c2,...,cn],..., ] => dimension: rows x columns
   */
  async query(q){
    const client = await this.pool.connect();
    let result={};
    try{
      result = await client.query(q);
    }catch(e){
      debug.error("Exception on query: "+q,e);
      result.rows = [];
    }finally{
      // Issue 2: need to catch exceptions and release connection
      client.release();
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

module.exports = Postgres;