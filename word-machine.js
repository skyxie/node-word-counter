
'use strict';

var _ = require("underscore");
var path = require('path');
var crypto = require('crypto');
var Async = require('async');
var sqlite3 = require('sqlite3').verbose();

var WordMachine = function(logger, filename) {
  logger.debug("Creating WordMachine with sqlite file: %s", filename);
  var db = new sqlite3.Database(filename);

  this.db = db;
  this.logger = logger;
  this.secret = "some-secret-salt";
};

WordMachine.prototype.initialize = function(callback) {
  var self = this;
  var db = this.db;

  // Create in-memory table of random text
  db.serialize(function() {
    db.get("SELECT count(1) as count FROM sqlite_master WHERE type=? AND name=?", "table", "lorem", function(err, row) {
      if (err || row.count >= 1) {
        callback(err);
      } else {
          db.run("CREATE TABLE lorem (text TEXT)", function(err) {
          if (err) {
            callback(err);
          } else {
            // Add initial random text
            self.addText(
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit, "+
              "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              callback
            );
          }
        });
      }
    });
  });
};

WordMachine.prototype.addText = function(text, callback) {
  var db = this.db;
  var logger = this.logger;

  // Remove all punctuation and reduce all characters to lower case
  text = text.replace(/[^ a-zA-Z0-9]/g, "").toLowerCase();
  logger.debug("Insert text \"%s\"", text);

  db.serialize(function() {
    db.run("INSERT INTO lorem VALUES (?)", text, callback);
  });
};

WordMachine.prototype.randText = function(callback) {
  var db = this.db;
  var logger = this.logger;

  db.serialize(function() {
    db.all("SELECT text FROM lorem", function(err, rows) {
      if (err) {
        callback(error);
      } else {
        var randomIndex = Math.floor(Math.random() * rows.length);
        logger.debug("Selected text %d out of %d: \"%s\"", randomIndex, rows.length, rows[randomIndex].text);
        callback(null, rows[randomIndex].text);
      }
    });
  });
};

WordMachine.prototype.randWords = function(text) {
  var words = _.uniq(text.split(/\s+/));
  var numRandWords = Math.floor(words.length * 0.25);
  this.logger.debug("Selecting %d out of %d shuffled words", numRandWords, words.length);
  return _.shuffle(words).slice(0, numRandWords);
};

WordMachine.prototype.randPayload = function(callback) {
  var self = this;
  self.randText(function(error, text) {
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

var _wordCount = require(path.resolve(__dirname, "public", "word-count.js")).wordCount;
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
