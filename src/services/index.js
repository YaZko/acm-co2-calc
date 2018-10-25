const users = require('./users/users.service.js');
const airport = require('./airport/airport.service.js');
const city = require('./city/city.service.js');
const csv = require('./csv/csv.service.js');
const routes = require('./routes/routes.service.js');
module.exports = function () {
  const app = this; // eslint-disable-line no-unused-vars
  app.configure(users);
  app.configure(airport);
  app.configure(city);
  app.configure(csv);
  app.configure(routes);
};