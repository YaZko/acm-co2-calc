/* eslint-disable no-console */
const logger = require('winston');
const app = require('./app');
const port = app.get('port');
const https = require('https');
const fs = require('fs');

// TODO: should move certs to nginx
if (app.get('ssl')) {
  const httpsServer = https.createServer({
    key: fs.readFileSync(app.get('ssl').keyPath),
    cert: fs.readFileSync(app.get('ssl').certPath),
    passphrase: app.get('ssl').passphrase
  }, app).listen(app.get('ssl').port);

  app.setup(httpsServer);
  httpsServer.on('listening', () =>
    logger.info(`Feathers application started on ${app.get('host')}:${app.get('ssl').port}`)
  );
} else {
  const server = app.listen(port);
  server.on('listening', () =>
    logger.info(`Feathers application started on ${app.get('host')}:${port}`)
  );
}

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);
