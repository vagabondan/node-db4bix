"use strict";


//const macroRegExp = new RegExp("(\\{\\$[^}]*\\})","ig");
const macroRegExp = /\{\$[^}]*\}/ig;
const result = "database.discovery.DB4bix.config[instanceid,{$DSN},{$CDN}]".match(macroRegExp);

console.log(result);

console.log(parseInt(true));
console.log(parseInt(null));
console.log(parseInt(undefined));


console.log(!!undefined);
console.log(!!null);
console.log(!!"");
console.log(!!0);

console.log(undefined);
console.log(null);
console.log("");
console.log(0);



console.log(!undefined);
console.log(![{id:1},undefined,{id:2}].filter(i=> i != null).find(i => i.id === 2));