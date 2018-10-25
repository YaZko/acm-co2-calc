/* run me in the root project directory, not in scripts/ */

const airports = require('../airport-data/largeAirports.json');

var app = require('../src/app');

airports.forEach((ap) => {
  if (!ap.iata)
    return;
  app.service('/airport').create(ap);
});
