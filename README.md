node-word-counter
=================

### Installation

1. Install node
2. Install npm packages: ````npm install````

### Run

    node application.js

with debug level logging

    LOG_LEVEL=debug node application.js

with Foreman

    foreman start -f Procfile

### Tests

    mocha test

### Web Client

    http://host:port/admin

Server is hosted on [heroku and the web client is accessible here](http://thawing-beyond-4963.herokuapp.com/admin). To get started, click "Fetch Payload" to retrieve a body of text and list of words to exclude from the text.
