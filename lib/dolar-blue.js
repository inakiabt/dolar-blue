var http = require('http'),
  moment = require('moment');

// Public API for this package
var getData = function(opts, cb) {

  // List of supported sources. If no source is specified in opts, will query
  // each of these sources and select the most recent result
  var sources = [
    'Bluelytics',
  ];

  // Container for response data
  var data = null;

  // Counter to keep track of most recent response
  var responseCount = 0;

  // Keep track of best (most recent) date seen
  var bestDate = 0;

  // Determine which source(s) to use, based on arguments
  if (typeof opts == 'function') {
    cb = opts;
  } else {
    sources = [opts.src];
  }

  // Function to handle response from sources
  var handleResponse = function(err, sourceData) {

    cb(null, sourceData);

  };

  // Process each requested source
  sources.forEach(function(source) {
    try {
      var sourceModule = require('./sources/' + source);
      sourceModule.getData(handleResponse);
    } catch (err) {
      cb(err);
    }
  });

};

// Public API for this object
exports.getData = getData;
