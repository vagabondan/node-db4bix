Date.prototype.addHours = function(h) {
  this.setTime(this.getTime() + (h*60*60*1000));
  return this;
};

Date.prototype.toISOLocalDateTime = function() {
  return this.addHours(3).toISOString().replace(/\.\d+/, '');
};

Date.prototype.getClockNs = function(){
  const timestamp = this.getTime()/1000;
  return {clock: ~~timestamp, ns: (timestamp % 1).toFixed(3)*1e9}
};

module.exports = Date;