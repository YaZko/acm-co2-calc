// Initializes the `routes` service on path `/routes`
const createService = require('feathers-mongoose');
const createModel = require('../../models/routes.model');
const hooks = require('./routes.hooks');
const filters = require('./routes.filters');

module.exports = function () {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'routes',
    Model,
    paginate,
    paginate: {
      default: 1500,
      max: 1500
    },
    lean: true
  };

  // Initialize our service with any options it requires
  app.use('/routes', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('routes');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
