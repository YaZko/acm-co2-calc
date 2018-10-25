/* eslint no-console: 1 */

module.exports = function (data, connection, hook) { // eslint-disable-line no-unused-vars
  if (! connection.user || !(connection.user._id.toString() !== data.user._id.toString())) {
    return false;
  }
  return data;
};
