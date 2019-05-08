const msleep = time =>{
  return new Promise(
    resolve => setTimeout(_=>resolve(), time)
  )
};

exports.msleep = msleep;