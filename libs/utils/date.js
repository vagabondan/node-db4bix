Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
};

//ISO 8601 String
Date.prototype.toISOLocalDateTime = function() {
  return this.addHours(3).toISOString().replace(/\.\d+/, '').replace(/Z/,'+0300');
};

Date.prototype.getClockNs = function(){
  // hrtime returns relative time in seconds and so does not meet our requierments
  // const hrTime = process.hrtime()
  // console.log(hrTime[0] * 1000000 + hrTime[1] / 1000)
  // return {clock: hrTime[0], ns: hrTime[1]};
  const timestamp = this.getTime()/1000;
  return {clock: ~~timestamp, ns: ~~((timestamp % 1).toFixed(3)*1e9)};
};

module.exports = Date;