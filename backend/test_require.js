const seq = require('sequelize');
seq.Op = { test: 123 };

console.log('Main file seq.Op:', seq.Op);

const cfiles = require('./routes/cfiles');
console.log('After requiring cfiles');
