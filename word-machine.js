
'use strict';

var _ = require("underscore");
var fs = require("fs.extra");
var path = require('path');
var glob = require('glob');
var crypto = require('crypto');
var Async = require('async');

//
// Private methods
//
var _publicWordCount = require(path.resolve(__dirname, "public", "word-count.js"));
var _cleanText = _publicWordCount.cleanText;
var _wordCount = _publicWordCount.wordCount;

var WordMachine = function(logger) {
  this.text_files = [];
  this.logger = logger;
  this.secret = "some-secret-salt";
};

WordMachine.prototype.initialize = function(textDir, callback) {
  var self = this;

  glob(path.join(textDir, "*"), function(error, files) {
    self.logger.debug("Found files: "+files.join(","));
    self.textFiles = files;
    callback(error);
  });
};

WordMachine.prototype.randText = function(callback) {
  var self = this;

  var textFile = path.resolve(_.sample(self.textFiles));
  self.logger.debug("Opening file: "+textFile);

  var fd = fs.createReadStream(textFile);

  var data = "", error = null;
  fd.on("readable", function() { self.logger.debug("Reading file: "+textFile); });
  fd.on("data", function(chunk) { data += chunk; });
  fd.on("error", function(err) { error = err; });
  fd.on("end", function() { callback(error, data); });
};

WordMachine.prototype.randWords = function(text) {
  var words = _.uniq(_cleanText(text).split(/\s+/));
  // Number of exclusion words should be 0 - n
  var numRandWords = Math.floor(Math.random() * (words.length + 1));
  this.logger.debug("Selecting %d out of %d unique words", numRandWords, words.length);
  return _.sample(words, numRandWords);
};

WordMachine.prototype.randPayload = function(callback) {
  var self = this;
  self.randText(function(error, text) {
    self.logger.debug(text);
    if (error) {
      callback(error);
    } else {
      var words = self.randWords(text);
      callback(null, {"text" : text, "words" : words, "token" : WordMachine.token(text, words, self.secret)});
    }
  });
};

WordMachine.prototype.verifyPayload = function(payload) {
  return payload.token === WordMachine.token(payload.text, payload.words, this.secret);
};

//
// Class methods
//

WordMachine.wordCount = function(text, exceptWords) {
  return _wordCount(text, exceptWords, _);
}

WordMachine.token = function(text, words, secret) {
  var shasum = crypto.createHash("sha1");
  shasum.update(text, "utf8");
  shasum.update(words.join(" "), "utf8");
  shasum.update(secret, "utf8")
  return shasum.digest("hex");
};

module.exports = WordMachine;
