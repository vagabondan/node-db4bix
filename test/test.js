"use strict";


//const macroRegExp = new RegExp("(\\{\\$[^}]*\\})","ig");
const macroRegExp = /\{\$[^}]*\}/ig;
const result = "database.discovery.DB4bix.config[instanceid,{$DSN},{$CDN}]".match(macroRegExp);

console.log(result);