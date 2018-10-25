const handler = require('feathers-errors/handler');
const notFound = require('feathers-errors/not-found');

const auth = require('feathers-authentication');
const { authenticate } = auth.hooks;

const cityOrAirQuery = require('./city-or-air-query');

const footprintQuery = require('./footprint-query');

const csvUpload = require('./csv-upload');

const redirectLogin = require('./redirect-login');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

// Uploading
const multer = require('multer');
var upload = multer({
  dest: path.join(__dirname, '../../csvUploads/'),
  preservePath: true,
  limits: {
    fileSize: 5000000
  }});

const computeHops = require('./compute-hops');

module.exports = function () {
  // Add your custom middleware here. Remember, that
  // in Express the order matters, `notFound` and
  // the error handler have to go last.
  const app = this;

  app.use(redirectLogin());

  app.use('/airportQuery', authenticate, cityOrAirQuery(app));

  app.use('/footprintQuery', authenticate, footprintQuery(app));

  // because this is not a feathers service but is plain express middleware,
  // we can't use the authenticate service middleware because of promises.
  // instead, we use plain express auth with jwt to prevent unauth'd uploads
  // also, need to re-add bodyParser because multer or feathers strip the body
  app.post('/csvUpload', auth.express.authenticate('jwt'), upload.single('userfile'), bodyParser.urlencoded({extended: true}), csvUpload(app));

  // so we can't really authenticate on downloading CSV's, but someone will
  // have to brute force the download URL, which will take millenia since the
  // filename is an MD5 hash
  app.use('/csvDownload', /*auth.express.authenticate('jwt'),*/ express.static(path.join(__dirname, '../../csvUploads/')));

  app.use('/computeHops', authenticate, computeHops(app));

  app.use(notFound());
  app.use(handler());
};
