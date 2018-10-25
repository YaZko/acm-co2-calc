/* eslint no-console: 1 */

module.exports = function (data, connection, hook) { // eslint-disable-line no-unused-vars
  // TODO: is this enough?
  if (!connection.user || !connection.user._id) {
    return false;
  }
  return data;
};
