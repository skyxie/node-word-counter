
(function() {
  var self = this;

  self.cleanText = function(text) {
    return text.replace(/[^ a-zA-Z0-9]/g, "").toLowerCase();
  };

  self.wordCount = function(text, exceptWords, _) {
    var wordCount = _.reduce(self.cleanText(text).split(/\s+/), function(memo, value) {
      if (_.has(memo, value)) {
        memo[value] += 1;
      } else {
        memo[value] = 1;
      }
      return memo;
    }, {});

    _.each(exceptWords, function(exceptionWord) {
      delete wordCount[exceptionWord];
    });

    return wordCount;
  };
}).call(this);