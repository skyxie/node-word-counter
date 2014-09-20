
'use strict';

var path = require("path");
var controller = require(path.resolve(__dirname, "word-machine-controller"));

var routing = function(app, logger, sqlite) {
  app.get('/', controller.showFunction(logger, sqlite));
  app.post('/', controller.verifyFunction(logger, sqlite));
  app.get('/admin', controller.adminFunction(logger,sqlite));
  app.post('/admin', controller.addTextFunction(logger, sqlite));
};

module.exports = routing;
