const sql = require('mssql');

sql.on('error', err => {
  // ... error handler
});


class MSSQL{

  constructor({config}){
    config = {
      user: '...',
      password: '...',
      server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
      database: '...',

      options: {
        encrypt: true // Use this if you're on Windows Azure
      }
    };
    Object.assign(this, {
      config
    });
  }

  async init(){
    try {
      let pool = await sql.connect(config)
      let result1 = await pool.request()
        .input('input_parameter', sql.Int, value)
        .query('select * from mytable where id = @input_parameter')

      console.dir(result1)

      // Stored procedure

      let result2 = await pool.request()
        .input('input_parameter', sql.Int, value)
        .output('output_parameter', sql.VarChar(50))
        .execute('procedure_name');

      console.dir(result2)
    } catch (err) {
      // ... error checks
    }

  }

}


module.exports = function(module_holder) {
  // the key in this dictionary can be whatever you want
  // just make sure it won't override other modules
  module_holder['mssql'] = MSSQL;
};