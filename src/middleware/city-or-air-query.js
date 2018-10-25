const Heap = require('qheap');
const airports = require('../../airport-data/largeAirports.json');
var geolib = require('geolib');

function compare(a, b) {
  return a.dist < b.dist;
}

function getClosestAirport(city, fulfill, reject, app) {
  //var closestAirport = null;
  //var closestDist = Number.MAX_SAFE_INTEGER;
  var heap = new Heap({ comparBefore : compare });

  airports.forEach((data) => {
    // we want to remove air force bases and etc
    // TODO: probably do this in the database eventually
    if (data.name.includes(" Base"))
      return;

    const airLat = data.latitude;
    const airLong = data.longitude;

    if (!airLat || ! airLong)
      return;
    var dist = geolib.getDistance({
      latitude: airLat,
      longitude: airLong,
    }, {
      latitude: cityLat,
      longitude: cityLong
    });
    data.dist = dist;
    heap.insert(data);

  });

  const RESULT_LIMIT = 5;
  var arr = [];
  for (var i = 0; i < RESULT_LIMIT; i++) {
    var cur = heap.shift();
    // reduce to store as a mongoose sub-doc
    arr[i] = {
      dist: cur.dist,
      iata: cur.iata,
      name: cur.name,
      wiki_link: cur.wiki_link
    }
  }

  city.closestAirports = arr;
  fulfill(city);
}

function airportsForCity(cityName, app) {
  var ret = new Promise(function (fulfill, reject) {
    app.geocoder.geocode(cityName, (err, res) => {
      if (!err && !!res && !!res.length && res.length >= 1) {
        cityLat = res[0].latitude;
        cityLong = res[0].longitude;
        getClosestAirport(res[0], fulfill, reject, app);

      } else {
        if (err) {
          console.error("geocode error:", err)
          reject(err);
        } else {
          console.error("no results ",cityName);
          reject(new Error('no results '+ cityName));
        }
      }
    });
  });
  return ret;
}

module.exports = (app) => {
  return {
    get(id) {
      // sanitize
      id = id.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

      // 1) if id is an iata code, return airport directly
      // 2) if id is indexed city, query city then query airport
      // 3) else, fallback to Google geocode API
      if (id.length == 3) {
        return app.service('/airport').find({
          query: {
            iata: id.toUpperCase()
          }
        });
      } else if (id.length <= 1) {
        return Promise.resolve({total: 0, data: []})
      }
      return app.service('/city').find({
        query: {
          input: id
        }
      }).then(res => {
        if (res.total == 0) {
          // fallback to Geocoding
          return airportsForCity(id, app)
            .then(city => {
              city.input = id;
              app.service('/city')
              .create(city).then(cityCreateRes => {
              }).catch( err => {
                console.error('city make err', err);
              })
              return {
                total: 1,
                isCity: true,
                cached: false,
                data: city
              };
              return city
          });
        }
        var ret = {
          total: 1,
          isCity: true,
          cached: true,
          data: res.data[0]
        }
        return ret;
      })
    }
  }
}
