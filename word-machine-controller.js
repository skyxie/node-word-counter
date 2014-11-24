
'use strict';

var _ = require("underscore");
var path = require('path');
var Async = require('async');
var WordMachine = require(path.resolve(__dirname, "word-machine"));

var showFunction = function(logger) {
  return function(req, res) {
    Async.waterfall(
      [
        function(callback) {
          var wm = new WordMachine(logger);
          wm.initialize(path.resolve(__dirname, "texts"), function(error) {
            callback(error, wm);
          });
        },
        function(wm, callback) {
          wm.randPayload(callback);
        }
      ],
      function(error, payload) {
        if (error) {
          res.status(400).json({"error" : {"message" : error.message }});
        } else {
          res.status(200).json({"payload" : payload});
        }
      }
    );
  };
};

var verifyFunction = function(logger) {
  return function(req, res) {
    var wm = new WordMachine(logger);
    var payload = req.param("payload");
    logger.debug("Received payload:", payload);

    if (typeof(payload) == "undefined") {
      res.status(400).json({"error" : {"message" : "Missing payload" }});
    } else if (!wm.verifyPayload(payload)) {
      res.status(400).json({"error" : {"message" : "Invalid token - stop trying to cheat!" }});
    } else {
      var expected = WordMachine.wordCount(payload.text, payload.words);
      var actual = payload.word_count;

      if (!_.isEqual(actual, expected)) {
        logger.debug(JSON.stringify({"expected" : expected, "actual" : actual}));
        res.status(400).json({"error" : {"message" : "Invalid count" }});
      } else {
        res.sendStatus(200);
      }
    }
  };
};

var adminFunction = function(logger) {
  return function(req, res) {
    wordMachineFunction(logger)(function(error, wm) {
      res.render("admin.html.ejs", {"word_machine" : wm});
    });
  };
};

module.exports = {
  "showFunction" : showFunction,
  "verifyFunction" : verifyFunction,
  "adminFunction" : adminFunction
};
