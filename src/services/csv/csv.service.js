// Initializes the `csv` service on path `/csvInputs`
const createService = require('feathers-mongoose');
const createModel = require('../../models/csv.model');
const hooks = require('./csv.hooks');
const filters = require('./csv.filters');

module.exports = function () {
  const app = this;
  const Model = createModel(app);
  const paginate = app.get('paginate');

  const options = {
    name: 'csv',
    Model,
    paginate: {
      default: 500,
      max: 500
    },
    lean: true
  };

  // Initialize our service with any options it requires
  app.use('/csvInputs', createService(options));

  // Get our initialized service so that we can register hooks and filters
  const service = app.service('csvInputs');

  service.hooks(hooks);

  if (service.filter) {
    service.filter(filters);
  }
};
