"use strict";

module.exports = function(objDefault) {
  let thisresolve;
  let thisreject;
  const msgReject = new Error("defer.reject");

  var defer = new Promise(function(resolve, reject) {
    thisresolve = resolve;
    thisreject  = reject;
  });

  defer.resolve = function(body) { thisresolve(body); };
  defer.reject  = function(err) { thisreject(err || objDefault || msgReject); };
  defer.chain   = function(err, body) {
    if(err) return defer.reject(err);
    return defer.resolve(body);
  };

  return defer;
};
