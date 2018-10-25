// airport-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const airport = new mongooseClient.Schema({
    iata: { type: String, required: true, index: true, unique: true },
    ident: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    type: { type: String, required: true },
    name: { type: String, required: true },
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    elevation_ft: { type: String },
    continent: { type: String, required: true },
    country: { type: String, required: true },
    region: { type: String, required: true },
    municipality: { type: String },
    wiki_link: { type: String },
  });

  return mongooseClient.model('airport', airport);
};
