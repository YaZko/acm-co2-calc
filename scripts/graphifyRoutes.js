/* run me in the root project directory, not in scripts/ */

const csv = require('csv-parse');
const fs = require('fs');
const transform = require('stream-transform');
const stringify = require('csv-stringify');
const geolib = require('geolib');

var app = require('../src/app');

const csvInput = fs.createReadStream('airport-data/routes.dat.txt');
const out = fs.createWriteStream('airport-data/routes.raw.csv');
const airportService = app.service('/airport');

const transformer = transform((record, cb) => {
    // if the entry is a direct flight, and we're passed a 3-letter IATA code
    if (record[7] === '0' && record[2].length == 3 && record[4].length == 3) {
      var srcIATA;
      /*iatas.find({iata: record[2].toUpperCase()}).toArray(function(err, result) {
        if (result.length > 0)
          cb(null, result[0].iata);
      });*/
      airportService.find({
        query: {
          iata: record[2].toUpperCase()
        }
      }).then(res => {
        if (!res || res.total == 0) {
          cb(null, null);
          return;
        }
        srcIATA = res;
        return airportService.find({
          query: {
            iata: record[4].toUpperCase()
          }
        })
      }).then(destIATA => {
        if (! destIATA || destIATA.total == 0) {
          cb(null, null);
          return;
        }

        if (!srcIATA.data[0].latitude || !srcIATA.data[0].longitude
          || !destIATA.data[0].latitude || !destIATA.data[0].longitude) {
          cb(null, null);
          return;
        }
        var dist = geolib.getDistance({
          latitude: srcIATA.data[0].latitude,
          longitude: srcIATA.data[0].longitude,
        }, {
          latitude: destIATA.data[0].latitude,
          longitude: destIATA.data[0].longitude
        });

        cb(null, srcIATA.data[0].iata+','+destIATA.data[0].iata+','+dist+'\n')
      }).catch(err => {
        console.log("something bad happened", err)
        cb(err, null);
      })
    }
  });
var parser = csv();

csvInput.pipe(parser)
.pipe(transformer)
//.pipe(stringify({header: false}))
//.pipe(process.stdout)
.pipe(out)
.on('finish', () => {
  console.log("complete--safe to terminate");
})
