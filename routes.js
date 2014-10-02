
'use strict';

var path = require("path");
var controller = require(path.resolve(__dirname, "word-machine-controller"));

var routing = function(app, logger) {
  app.get('/', controller.showFunction(logger));
  app.post('/', controller.verifyFunction(logger));
  app.get('/admin', controller.adminFunction(logger));
};

module.exports = routing;
