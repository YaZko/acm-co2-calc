/* run me in the root project directory, not in scripts/ */
const csv = require('csv-parse');
const fs = require('fs');
const transform = require('stream-transform');
const stringify = require('csv-stringify');

const csvInput = fs.createReadStream('airport-data/routes-uniq.csv');

var app = require('../src/app');
const routes = app.service('/routes');
const transformer = transform((record, cb) => {
  routes.create({
    src: record[0],
    dest: record[1],
    dist: parseInt(record[2])
  }).then(res => {
    cb(null, routes.toString()+'\n');
  }).catch(err => {
    console.err(err);
  });
});

csvInput.pipe(csv())
.pipe(transformer)
//.pipe(stringify({header: false}))
.pipe(process.stdout)
