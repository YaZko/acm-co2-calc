/* run me in the root project directory, not in scripts/ */
const csv = require('csv-parse');
const fs = require('fs');
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const out = fs.createWriteStream('airport-data/routes.json');

const csvInput = fs.createReadStream('airport-data/routes-uniq.csv');

const transformer = transform((record, cb) => {
  cb(null, JSON.stringify({
    src: record[0],
    dest: record[1],
    dist: parseInt(record[2])
  })+',\n' );
});

csvInput.pipe(csv())
.pipe(transformer)
//.pipe(stringify({header: false}))
.pipe(out)
