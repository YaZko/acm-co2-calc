// csv-model.js - A mongoose model

module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const csv = new mongooseClient.Schema({
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    results: [{
      airports: [{type: String}],
      roundtrip: {type: Boolean},
      radforcing: {type: Boolean},
      totalDist: {type: Number},
      emissions: {type: Number},
      passengerName: {type: String},
      inputCities: {type: String},
      distTooShort: {type: Boolean},
      partialDists: [{type: Number}],
      partialCO2s: [{type: Number}],
      error: {type: String}
    }],
    csvPath: {type: String, required: true},
    // orig upload name
    name: {type: String, unique: true, required:true, index: true},
    origFilename: {type: String},
    user: {
      type: mongooseClient.Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    totalEmissions: {type: Number},
    totalDist: {type: Number},
    totalPassengers: {type: Number},
    totalErrors: {type: Number},
    ignoreUnderDist: {type: Number},
    conferenceLocation: {type: String}
  });

  return mongooseClient.model('csv', csv);
};
