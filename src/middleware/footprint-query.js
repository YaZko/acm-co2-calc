var geolib = require('geolib');
module.exports = function (app) {
  // All data from DEFRA 2016, see:
  // http://www.carbonneutralcalculator.com/Calculator_Methodology_Paper_2016.pdf
  function calculateEmissions(dist, radForcing) {
    // assert dist is typeof Number
    // dist is in KM
    const radForcingFactor = radForcing ? 1.891 : 1;
    // emission factors are for economy class only
    var multFactor;
    if (dist < 785) {
      // short range, avg since data isn't available for economy
      multFactor = 0.14735;
    } else if (dist >= 785 && dist <= 3700) {
      // medium range economy
      multFactor = 0.08728;
    } else {
      // long range economy
      multFactor = 0.07761;
    }
    return dist * multFactor * radForcingFactor;

  }

  const airportQuery = app.service('/airport');
  return {
    /* format
    {
    airports: [iad, fra, abc]
    roundtrip: true,
    radforcing: false,
  }
  */
  create(data, params) {
    return new Promise( (resolve, reject) => {
      if (!data || ! (data.airports instanceof Array) ||
        data.airports.length <= 1 || !data.airports[0] instanceof String)
        reject(new Error("Invalid data"));

      var airports = data.airports.map(item => {return item.toUpperCase()});

      var promises = [];
      var aps = []
      for (var i = 0; i < airports.length; i++) {
        const pos = i;
        promises.push(airportQuery.find({ query: {iata: airports[pos]}}).then(ret => {
          if (!!ret || !ret.data || ret.total < 1) {
            aps[pos] = ret.data[0];
          } else {
            reject(new Error("Invalid IATA"));
            return;
          }
        }));
      }
      Promise.all(promises).then( () => {
        const partialDists = [];
        const partialCO2s = [];
        var totalDist = 0;
        var totalEmissions = 0;
        for (var i = 0; i < aps.length - 1; i++) {
          // curdist is 0?
          if (!aps[i] || !aps[i].latitude || !aps[i].longitude) {
            reject(new Error("Location not found"));
            return;
          }
          var curDist = geolib.getDistance({
            latitude: parseFloat(aps[i].latitude),
            longitude: parseFloat(aps[i].longitude)
          }, {
            latitude: parseFloat(aps[i+1].latitude),
            longitude: parseFloat(aps[i+1].longitude)
          });

          // meters -> km
          curDist /= 1000;

          var emissions = calculateEmissions(curDist, !!data.radforcing);

          // kg co2 -> tons
          emissions /= 1000;
          partialDists.push(curDist);
          partialCO2s.push(emissions);

          if (!! data.roundtrip) {
            // rather than mult dist by two, we need to preserve the mult factors
            // based on distance, so we double the distance and emissions after
            // they're computed
            curDist *= 2;
            emissions *= 2;
          }

          totalDist += curDist;
          totalEmissions += emissions;
        }

        resolve({
          airports,
          roundtrip: !!data.roundtrip,
          radforcing: !!data.radforcing,
          totalDist,
          partialDists,
          emissions: totalEmissions,
          partialCO2s
        })
      });
    });
  }
}
}
