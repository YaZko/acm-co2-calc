var geolib = require('geolib');
var airports = require('airport-codes');
//var cities = require('cities');

var NodeGeocoder = require('node-geocoder');
const Heap = require('qheap');

const options = {
  provider: 'google',

  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: 'AIzaSyAMZJcBB37Nr5hZNGgT68YasHI7-alv7hE', // for Mapquest, OpenCage, Google Premier
  formatter: null         // 'gpx', 'string', ...
};

var geocoder = NodeGeocoder(options)

function airportForCity(cityName, cb) {
  geocoder.geocode(cityName, (err, res) => {
    if (!err && !!res && !!res.length && res.length >= 1) {
      cityLat = res[0].latitude;
      cityLong = res[0].longitude;
      console.log(res[0]);
      getClosestAirport(cityLat, cityLong, cb);

    } else {
      if (err) {
        console.log("geocode error:")
        console.log(err)
      } else {
        console.log("no results");
      }
    }
  });
};

//http://www.geonames.org/export/
//https://www.eia.gov/environment/emissions/co2_vol_mass.php

function compare(a, b) {
  return a.get('dist') < b.get('dist');
}

function getClosestAirport(cityLat, cityLong, cb) {
  //var closestAirport = null;
  //var closestDist = Number.MAX_SAFE_INTEGER;
  var heap = new Heap({ comparBefore : compare });

  airports.each((data) => {
    if (data.get('type') !== 'large_airport')
      return;
    const airLat = data.get('latitude');
    const airLong = data.get('longitude');

    if (!airLat || ! airLong)
      return;
    var dist = geolib.getDistance({
      latitude: airLat,
      longitude: airLong,
    }, {
      latitude: cityLat,
      longitude: cityLong
    });
    data.set('dist', dist);
    heap.insert(data);

/*
    if (dist < closestDist) {

      closestDist = dist;
      closestAirport = data;
    }
*/
  });

  //console.log(heap.shift().get('iata'));
  //console.log(closestAirport.get("iata")+" "+closestAirport.get("name"));
  cb(heap.shift());
}

function calcCo2Airtravel(airport1, airport2) {

}

function getAirportObj(query) {
  const q = query.toLowerCase();
  airports.each(data => {
    if (data.get('iata').toLowerCase() === q) {
      return data;
    }
  });
  return null;
}

var ap1 = airportForCity("toronto, ca", (ap) => {
 console.log(ap.get('iata'));
});
var ap2 = airportForCity("bahamas", (ap) => {

 console.log(ap.get('iata'));
});
