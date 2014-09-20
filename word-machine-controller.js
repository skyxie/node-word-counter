
'use strict';

var _ = require("underscore");
var path = require('path');
var Async = require('async');
var WordMachine = require(path.resolve(__dirname, "word-machine"));

var wordMachineFunction = function(logger, filename) {
  var wm = new WordMachine(logger, filename);
  return function(callback) {
    wm.initialize(function(error) {
      callback(error, wm);
    });
  };
};

var showFunction = function(logger, filename) {
  return function(req, res) {
    Async.waterfall(
      [
        wordMachineFunction(logger, filename),
        function(wm, callback) {
          wm.randPayload(callback);
        }
      ],
      function(error, payload) {
        if (error) {
          res.status(400).send({"error" : {"message" : error.message }});
        } else {
          res.status(200).send({"payload" : payload});
        }
      }
    );
  };
};

var verifyFunction = function(logger, filename) {
  return function(req, res) {
    Async.waterfall(
      [
        wordMachineFunction(logger, filename),
        function(wm, callback) {
          var payload = req.param("payload");
          if (typeof(payload) == "undefined") {
            callback(new Error("Missing payload"));
          } else if (!wm.verifyPayload(payload)) {
            callback(new Error("Invalid token - stop trying to cheat!"));
          } else {
            var expected = WordMachine.wordCount(payload.text, payload.words);
            var actual = payload.word_count;

            if (!_.isEqual(actual, expected)) {
              logger.debug(JSON.stringify({"expected" : expected, "actual" : actual}));
              callback(new Error("Invalid count"));
            } else {
              callback();
            }
          }
        }
      ],
      function(error) {
        if (error) {
          res.status(400).send({"error" : {"message" : error.message }});
        } else {
          res.sendStatus(200);
        }
      }
    );
  };
};

var adminFunction = function(logger, filename) {
  return function(req, res) {
    wordMachineFunction(logger, filename)(function(error, wm) {
      res.render("admin.html.ejs", {"word_machine" : wm});
    });
  };
};

var addTextFunction = function(logger, filename) { 
  return function(req, res) {
    Async.waterfall(
      [
        wordMachineFunction(logger, filename),
        function(wm, callback) {
          wm.addText(req.param("text"), callback);
        }
      ],
      function(error) {
        if (error) {
          res.status(400).send(error);
        } else {
          res.sendStatus(200);
        }
      }
    );
  };
};

module.exports = {
  "showFunction" : showFunction,
  "verifyFunction" : verifyFunction,
  "adminFunction" : adminFunction,
  "addTextFunction" : addTextFunction
};
