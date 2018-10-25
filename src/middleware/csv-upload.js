var csv = require('csv-parse');
var fs = require('fs');
var transform = require('stream-transform');
var stringify = require('csv-stringify');
var xss = require('xss');
var firstline = require('firstline');

module.exports = function(app) {
  const airportQuery = app.service('/airportQuery');
  const footprintQuery = app.service('/footprintQuery');
  const csvService = app.service('/csvInputs');
  return function csvUpload(req, res, next) {
    var minDist = req.body.minKM ? parseInt(req.body.minKM) : 0;

    var failed = false;
    var failure = (err) => {
      if (failed) {
        return;
      }
      failed = true;
      res.status(400);
      res.format({
        'application/json': () => {
          res.json({"error": {"cause": err, "isOperational": true}});
        }
      });
      console.error(err);
      if (!!res.file && !!res.file.path) {
        fs.unlink(res.file.path)
      }
    }

    var conferenceIATA = xss(req.body.conferenceLocation || "");
    const shouldAnonymize = xss(req.body.shouldAnonymize || "false") == "true";
    const globalRadForcing = xss(req.body.globalRadForcing || "false") == "true";

    const resultPath = req.file.path+'.results.csv';
    const csvInput = fs.createReadStream(req.file.path);
    const out = fs.createWriteStream(resultPath);

    const lineone = firstline(req.file.path);

    var totalEmissions = 0;
    var totalDist = 0;
    var results = new Array();
    var totalPassengersProcessed = 0;
    var totalErrors = 0;
    var curPassenger = 0;

    const computeEmissions = transform(function(record, cb){

      var softFailure = false;

      if (!record) {
        failure("Malformed CSV record");
        return;
      }

      record.num = curPassenger;

      record.passengerName = record.passengerName || record.name || record.passenger || record.passengername;

      if (!!record.passengerName && shouldAnonymize) {
        curPassenger++;
        record.passengerName = "Person " + curPassenger;
      } else {
        record.passengerName = xss(record.passengerName);
      }

      if (!record.city1) {
        failure("City1 column not found");
        return;
      }
      if (!record.city2) {
        if (!conferenceIATA) {
          failure("No city2 column; Did you remember to input the conference location?");
          return;
        }
        record.city2 = conferenceIATA;
      }
      if (!record.isRoundtrip) {
        record.isRoundtrip = 1;
      }

      record.includeRadForcing = globalRadForcing;

      var cities = [xss(record.city1), xss(record.city2)];
      if (!!record.city3) {
        cities.push(xss(record.city3));
      }
      if (!!record.city4) {
        cities.push(xss(record.city4));
      }
      if (!!record.city5) {
        cities.push(xss(record.city5));
      }

      var aps = [], queryPromises = [];

      const softFail = (reason) => {
        if (softFailure) {
          return;
        }
        softFailure = true;
        totalPassengersProcessed++;
        totalErrors++;
        var csvObj = {
          passengerName: record.passengerName,
          inputCities: cities,
          distTooShort: false,
          num: record.num,
          totalEmissions: -1,
          totalDist: -1,
          airports: aps,
          roundtrip: record.isRoundTrip,
          radforcing: record.includeRadForcing,
          error: reason
        };
        results.push(csvObj);

        cb(null, Object.assign(record, {
          emissions: -1,
          dist: -1,
          distTooShort: "false"
        }));
      }

      var i = 0;

      for (i = 0; i < cities.length; i++) {
        const pos = i;
        const queryPromise = airportQuery.get(cities[i]).then(ret => {
          if (ret.isCity) {
            for (var j = 0; j < ret.data.closestAirports.length; j++) {
              const curIATA = ret.data.closestAirports[j].iata;
              if (! app.overrides.includes(curIATA.toUpperCase())) {
                aps[pos] = curIATA
                break;
              }
            }
            if (i == ret.data.closestAirports.length) {
              softFail("All nearby airports are in overrides list "+cities[i]);
              return;
            }
          } else if (ret.data.length >= 1) {
            aps[pos] = ret.data[0].iata;
          } else {
            softFail("Cannot find city or airport "+cities[i]);
            return;
          }
        })
        .catch(function (err) {
          console.error('airport query failed');
          softFail("Could not resolve this location: "+ cities[pos]);
        });
        queryPromises.push(queryPromise);
      }

      // wait for all queries to resolve
      Promise.all(queryPromises).then(() => {
        // execute the service query as if it were a web query
        return footprintQuery.create({
          airports: aps,
          roundtrip: record.isRoundTrip,
          radforcing: record.includeRadForcing
        }).catch(function(err) {
          console.error("caught footprint calculation error", err);
          softFail("Footprint calculation error");
        });
      }).then(res => {
        if (softFailure) {
          return;
        }

        if (res == null) {
          softFail("Cannot process "+record.city1 + " "+ record.city2);
          return;
        }
        var csvObj = res;
        delete csvObj.cached;
        csvObj.passengerName = record.passengerName;
        csvObj.inputCities = cities;
        // if we're not in the threshold provided by the user
        csvObj.distTooShort = csvObj.totalDist < minDist || (csvObj.totalDist == 0);
        csvObj.num = record.num;

        if (!csvObj.distTooShort) {
          totalEmissions += res.emissions;
        }
        totalDist += res.totalDist;
        totalPassengersProcessed++;

        results.push(csvObj);
        cb(null, Object.assign(record, {
          emissions : res.emissions,
          dist : res.totalDist,
          distTooShort : csvObj.distTooShort.toString()
        }));
        return res;
      }).catch(err => {
        console.error("caught error after promise coalesce", error);
        failure("Footprint processing error");
      })
    })


    var parser = csv({columns: true, comment: "#"})
    .on('error', err => {
      console.error("error after parse", err);
      failure(err.message || "Error parsing CSV, are you sure this is a valid CSV?");
    });
    var util = require('util');
    var stream = require('stream');

    // fix Windows line endings
    function UniformLineEndings() {
        stream.Transform.call(this);
    }
    UniformLineEndings.CR_PATTERN = /\r/g;
    util.inherits(UniformLineEndings, stream.Transform);
    UniformLineEndings.prototype._transform = function (chunk, enc, cb) {
        this.push(chunk.toString().replace(UniformLineEndings.CR_PATTERN, ''));
        cb();
    };



    const customParser = () => {
      csvInput
      .pipe(new UniformLineEndings())
      .pipe(parser)
      .pipe(computeEmissions)
      .pipe(stringify({header: true}))
      .pipe(out)
      .on('finish', () => {
        console.error('csv process finished', results.length);
        results.sort(function(a,b) {
          return a.num - b.num;
        });
        var csvEntry = {results, totalEmissions, totalDist};
        csvEntry.totalPassengers = totalPassengersProcessed;
        csvEntry.totalPassengersNoskip = results.length;
        csvEntry.csvPath = '/csvDownload/'+req.file.filename.replace("..","")+'.results.csv'//resultPath;
        csvEntry.user = req.feathers.user._id;
        csvEntry.name = req.file.filename;
        csvEntry.origFilename = req.file.originalname ? xss(req.file.originalname) : "myUpload.csv";
        csvEntry.totalErrors = totalErrors;
        csvEntry.ignoreUnderDist = minDist;
        csvEntry.conferenceLocation = conferenceIATA;
        if (! failed) {
          csvService.create(csvEntry).then(successfulEntry => {
            res.status(200);
            res.format({
              'application/json': () => {
                res.json(successfulEntry);
              }
            });
          }).catch( err => {
            failure(err.message || "Error saving updated CSV to disk")
          });
        }
      })
      .on('error', (err) => {
        failure(err.message || "CSV Parse Error");
      });
    }

    lineone.then((res) => {
      if (typeof res === 'string' || res instanceof String) {
        var reg = /#.*minDist=([0-9]+).*/;
        var matches = res.match(reg);
        if (!!matches && matches.length >= 2) {
          minDist = matches[1];
        }

        reg = /#.*conferenceLocation="(.*)".*/;
        matches = res.match(reg);
        if (!!matches && matches.length >= 2) {
          conferenceIATA = matches[1];
        }
      }

      customParser();
    });
  }
};
