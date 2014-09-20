
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
      var file = path.resolve(__dirname, "test_data");

      wm = new WordMachine(logger, file);
      wm.initialize(done);
    });

    afterEach(function(done) {
      var db = wm.db;

      db.serialize(function() {
        db.run("DROP TABLE lorem", done);
      });

      db.close();
    });

    it("should initialize database", function(done) {
      var db = wm.db;

      db.serialize(function() {
        db.each("SELECT text FROM lorem", function(err, row) {
          if (err) {
            done(err);
          } else {
            row.text.should.equal("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua");
            done();
          }
        });
      });
    });

    it("should callback random text", function(done) {
      wm.randText(function(err, text) {
        if (err) {
          done(err);
        } else {
          should.exist(text);
          text.should.equal("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua");
          done();
        }
      });
    });

    it("should add text stripped of symbols", function(done) {
      wm.addText(
        "To be, or not to be, that is the question—\n" +
        "Whether 'tis Nobler in the mind to suffer\n" +
        "The Slings and Arrows of outrageous Fortune,\n" +
        "Or to take Arms against a Sea of troubles,"
      );
      var db = wm.db;

      db.serialize(function() {
        db.each("SELECT text FROM lorem LIMIT 1 OFFSET 1", function(err, row) {
          if (err) {
            done(err);
          } else {
            row.text.should.equal(
              "to be or not to be that is the question" +
              "whether tis nobler in the mind to suffer" +
              "the slings and arrows of outrageous fortune" +
              "or to take arms against a sea of troubles"
            );
            done();
          }
        });
      });
    });

    describe("randWords", function() {
      it("should return a list of zero words from text of less than 4 unique words", function() {
        wm.randWords("foo bar foo bar").should.eql([]);
      });

      it("should return a list of one word from some text of more than 4 unique words", function() {
        var words = wm.randWords("foo bar lorem ipsum");
        words.length.should.equal(1);
        words[0].should.match(/foo|bar|lorem|ipsum/);
      });

      it("should return a list of two words from some text of more than 8 unique words", function() {
        var words = wm.randWords("the quick brown fox jumped over the lazy dog");
        words.length.should.equal(2);
        words[0].should.match(/quick|brown|fox|jumped|over|the|lazy|dog/);
        words[1].should.match(/quick|brown|fox|jumped|over|the|lazy|dog/);
        words[0].should.not.equal(words[1]);
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
          payload.text.should.equal("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua");
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