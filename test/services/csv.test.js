const assert = require('assert');
const app = require('../../src/app');

describe('\'csv\' service', () => {
  it('registered the service', () => {
    const service = app.service('csv');

    assert.ok(service, 'Registered the service');
  });
});
