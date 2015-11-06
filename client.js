var http = require('http');
var path = require('path');

var Async = require('async');
var Buffer = require('buffer');
var commander = require('commander');
var winston = require('winston');
var _ = require('underscore');

var wordCount = require(path.join(__dirname, 'public', 'word-count'));

commander.version('0.0.1')
  .option('-c, --concurrency [concurrency]', 'Run c concurrent requests')
  .option('-p, --port [port]', 'Port number')
  .option('-d, --debug', 'Log at debug level')
  .parse(process.argv);

var loggerTransport = new winston.transports.Console({
  "level" : (commander.debug ? 'debug' : 'info'),
  "dumpExceptions" : true,
  "showStack" : true,
  "colorize" : true
});

var logger = new winston.Logger({"transports" : [ loggerTransport ]});
var concurrency = commander.concurrency || 1;
var port = commander.port || 8000;

Async.parallel(
  _.map(_.range(commander.concurrency), function(i) {
    return function(callback) {
      Async.waterfall(
        [
          function getCaptchaResponse(cb) {
            var opts = {
              'hostname' : 'localhost',
              'port' : port,
              'method' : 'get',
              'headers' : {
                'Content-Type' : 'application/json'
              }
            };

            logger.debug("%d) sending get request", i);
            var get = http.request(opts, function(response) { cb(null, response); });
            get.on('error', cb);
            get.end();
          },
          function getCaptchaBody(response, cb) {
            var responseBody = '';
            response.on('data', function(chunk) {
              logger.debug("%d) received chunk of size: %d", i, chunk.length);
              responseBody += chunk;
            });
            response.on('error', cb);
            response.on('end', function() {
              logger.debug("%d) get response complete", i);
              cb(null, responseBody);
            });
          },
          function parseResponseBody(responseBody, cb) {
            try {
              cb(null, JSON.parse(responseBody));
            } catch (e) {
              cb(new Error("Could not parse JSON from: "+responseBody));
            }
          },
          function postCaptcha(parsedResponse, cb) {
            parsedResponse.payload.word_count = wordCount.wordCount(parsedResponse.payload.text, parsedResponse.payload.words, _);

            var body = JSON.stringify(parsedResponse);
            logger.debug("POST BODY", parsedResponse);
            var opts = {
              "hostname" : "localhost",
              "port" : port,
              "method" : "post",
              "encoding": "Utf8",
              'headers' : {
                'Content-Type' : 'application/json',
                'Content-Length' : body.length,
                'Accept' : 'application/json'
              }
            };

            logger.debug("%d) sending post request", i);
            var post = http.request(opts, function(response) {
              logger.debug("%d) received post response", i);
              cb(null, response);
            });
            post.on('error', cb);
            post.end(body);
          }
        ],
        function(error, response) {
          var statusCode = null;
          if (error) {
            logger.info("%d) ERROR: %s", i, error.message);
          } else {
            logger.debug("%d) STATUS: %s", i, response.statusCode);
            statusCode = response.statusCode;
          }
          callback(null, statusCode);
        }
      );
    };
  }),
  function(error, results) {
    if (error) {
      logger.error("ERROR: %s", error.message);
      process.exit(1);
    } else {
      logger.info("RESULTS: [%s]", results.join(","));
      process.exit(0);
    }
  }
);
