const sql = require('mssql');
const debug = require('debug')("db4bix:mssql");
debug('Init');

sql.on('error', err => {
  console.error("Connection error", err);
});


class MSSQL{

  constructor(){
    Object.assign(this,{
      pool: undefined
    })
  }

  async init({conf}){
    conf = {
      user: conf.user,
      password: conf.password,
      server: conf.host,
      database: conf.instance,
      pool: {
        min: parseInt(conf.pool.min),
        max: parseInt(conf.pool.max),
        idleTimeoutMillis: parseInt(conf.pool.idleTimeoutMillis),
      },
      options: conf.options
    };
    this.pool = new sql.ConnectionPool(conf);
    await this.pool.connect();
  }

  close(){
    this.pool.close();
    this.pool = undefined;
  }

  /**
   *
   * @param q - query string
   * @returns Array of Arrays: [[c1,c2,...,cn],[c1,c2,...,cn],..., ] => dimension: rows x columns
   */
  async query(q){
    const result = await this.pool.request()
      .query(q);

    // we have to flatten all agregations by column names if any
    return result.recordset.map(
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

module.exports = MSSQL;