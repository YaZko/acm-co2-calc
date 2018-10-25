const { authenticate }  = require('feathers-authentication').hooks;
const auth  = require('feathers-authentication-hooks');
const hooks = require('feathers-hooks-common');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [
      auth.queryWithCurrentUser({as: 'user'})
    ],
    get: [
      auth.restrictToOwner({ownerField: 'user'})
    ],
    create: [
      auth.associateCurrentUser({as: 'user'}),
      //csvUploadHook(),
    ],
    update: [
      auth.restrictToOwner({ownerField: 'user'})
    ],
    patch: [
      auth.restrictToOwner({ownerField: 'user'})
    ],
    remove: [
      auth.restrictToOwner({ownerField: 'user'})
    ]
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
