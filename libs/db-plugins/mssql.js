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

  async init({config}){
    config = {
      user: config.user,
      password: config.password,
      server: config.host,
      database: config.instance,
      pool: {
        min: parseInt(config.pool.min),
        max: parseInt(config.pool.max),
        idleTimeoutMillis: parseInt(config.pool.idleTimeoutMillis),
      },
      options: config.options
    };
    this.pool = await sql.connect(config);
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
      )
    );
  }

}


module.exports = function(module_holder) {
  // the key in this dictionary can be whatever you want
  // just make sure it won't override other modules
  module_holder['mssql'] = () => new MSSQL();
};