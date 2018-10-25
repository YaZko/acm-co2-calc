// Initializes the `city` service on path `/city`
const createService = require('feathers-mongoose');
const createModel = require('../../models/city.model');
const hooks = require('./city.hooks');
const filters = require('./city.filters');

module.exports = function () {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'city',
    Model,
    paginate,
    lean: true
  };

  // Initialize our service with any options it requires
  app.use('/city', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('city');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
