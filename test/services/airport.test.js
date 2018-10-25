const assert = require('assert');
const app = require('../../src/app');

describe('\'airport\' service', () => {
  it('registered the service', () => {
    const service = app.service('airport');

    assert.ok(service, 'Registered the service');
  });
});
