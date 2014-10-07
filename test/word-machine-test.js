
'use strict';

var winston = require("winston");
var sinon = require('sinon');
var chai = require('chai');
var should = chai.should();

var path = require('path');
var WordMachine = require(path.resolve(__dirname, "..", "word-machine"));

describe("WordMachine", function() {
  var wm;

  describe("instance", function() {
    beforeEach(function(done) {
      var consoleLoggerTransport = new winston.transports.Console({
                                     level: (process.env.LOG_LEVEL || "info"),
                                     dumpExceptions : true,
                                     showStack : true,
                                     colorize : true
                                   });

      var transports = [ consoleLoggerTransport ];
      var logger = new winston.Logger({"transports" : transports});
      var data = path.resolve(__dirname, "texts");

      wm = new WordMachine(logger);
      wm.initialize(data, done);
    });

    it("should callback random text", function(done) {
      wm.randText(function(err, text) {
        if (err) {
          done(err);
        } else {
          should.exist(text);
          text.should.equal("The quick brown fox jumped over the lazy dog.\n");
          done(err);
        }
      });
    });

    it("randWords should return a list of 0 to n words from some text of n unique words", function() {
      var words = wm.randWords("the quick brown fox jumped over the lazy dog");
      words.length.should.be.at.most(8);
      words.length.should.be.at.least(0);
      words.forEach(function(word) {
        word.should.match(/quick|brown|fox|jumped|over|the|lazy|dog/);
      });
    });
    
    it("should validate payload", function() {
      var payload = {
        "text" : "the quick brown fox jumped over the lazy dog",
        "words" : ["brown", "dog"]
      };
      payload["token"] = WordMachine.token(payload.text, payload.words, "some-other-secret");
      
      wm.verifyPayload(payload).should.be.false;

      wm.secret = "some-other-secret";
      wm.verifyPayload(payload).should.be.true;
    });

    it("should callback valid random payload", function(done) {
      wm.randPayload(function(error, payload) {
        if (error) {
          done(error);
        } else {
          payload.text.should.equal("The quick brown fox jumped over the lazy dog.\n");
          should.exist(payload.token);
          should.exist(payload.words);
          wm.verifyPayload(payload).should.be.true;
          done();
        }
      });
    });
  });

  describe("class", function() {
    describe("token", function() {
      it("should be idempotent", function() {
        var a = WordMachine.token("the quick brown fox jumped over the lazy dog", ["brown", "dog"], "secret");
        var b = WordMachine.token("the quick brown fox jumped over the lazy dog", ["brown", "dog"], "secret");
        a.should.equal(b);
      });

      it("should not easily collide", function() {
        var a = WordMachine.token("the quick brown fox jumped over the lazy dog", ["brown", "dog"], "secret");
        var b = WordMachine.token("the quick brown fox jumped over the lazy dog", ["dog"], "secret");
        var c = WordMachine.token("the quick brown fox jumped over the lazy dog", ["brown", "dog"], "foo");
        a.should.not.equal(b);
        a.should.not.equal(c);
        b.should.not.equal(c);
      });
    });

    describe("wordCount", function() {
      it("should count words without exception words", function() {
        WordMachine.wordCount("the quick brown fox jumped over the lazy dog", ["brown", "dog"]).should.eql({
          "the" : 2, "quick" : 1, "fox" : 1, "jumped" : 1, "over" : 1, "lazy" : 1
        });
      });
    });
  });
});
