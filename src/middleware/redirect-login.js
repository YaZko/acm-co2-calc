module.exports = function (options = {}) {
  return function redirectLogin(req, res, next) {
    next()
  };
};
