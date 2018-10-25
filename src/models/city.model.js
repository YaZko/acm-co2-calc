// city-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const city = new mongooseClient.Schema({
    input: { type: String, required: true, unique: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    formattedAddress: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    closestAirports: 
    [{
      dist: Number,
      iata: String,
      name: String,
      wiki_link: String,
    }]
  });

  return mongooseClient.model('city', city);
};
