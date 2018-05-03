var http = require('http');

// Bluelytics displays values from a number of sources. This will
// determine the average blue dolar rate from among these (excluding la nación rate)
var avg_blue = function(data) {

  // Filtered list containing only blue dolar values
  var only_blue = data.filter(function(s) {
    return (s.source !== 'la_nacion' && !isNaN(s.value_sell) && !isNaN(s.value_buy) && s.value_sell > 0 && s.value_buy > 0);
  });

  // Helper function to calculate the sum of a specific variable common to all data sources
  var sumVar = function(varName) {
    var passVar = varName;

    return function(a, b) {
      return a + b[passVar];
    };
  };

  // Helper function to determine the most recent of two dates being compared
  var lastDate = function(a, b) {
    ndate = new Date(b.date);
    return new Date(Math.max(a, ndate));
  };

  // Reduced (averaged) data product
  return {
    sell: parseFloat((only_blue.reduce(sumVar('value_sell'), 0) / only_blue.length).toFixed(4)),
    buy: parseFloat((only_blue.reduce(sumVar('value_buy'), 0) / only_blue.length).toFixed(4)),
    date: only_blue.reduce(lastDate, 0)
  };

};

function getFromOldAPI() {
  var options = {
    name: 'Bluelytics',
    host: 'api.bluelytics.com.ar',
    path: '/json/last_price'
  };

  return new Promise(function(resolve, reject) {
    var req = http.request(options, function(res) {
      var str = '';

      res.on('data', function(chunk) {
        str += chunk;
      });

      res.on('end', function() {

        // Set up return object
        var ret = {};
        var data;
        ret.date = new Date();
        ret.source = {
          name: options.name,
          uri: 'http://' + options.host + options.path
        };

        // Parse response from Bluelytics
        try {
          data = JSON.parse(str);
        } catch (err) {
          return cb('Bad JSON from ' + options.host + options.path + ':' + err + '\n' + str);
        }

        // Compute the rates using the average of all Bluelytics sources
        ret.rates = avg_blue(data);
        ret.data = data.reduce(function(mem, item) {
          return Object.assign({}, mem, {
            [item.source]: item,
          });
        }, {});
        ret.rates.source = options.name;

        if (!isNaN(ret.rates.sell) && !isNaN(ret.rates.buy)) {
          resolve(ret);
        } else {
          reject('Unexpected response from ' + options.host + options.path);
        }
      });
    });

    req.end();

    req.on('error', function(e) {
      reject(e);
    });
  });
}

function getBlue() {
  var options = {
    name: 'Bluelytics',
    host: 'api.bluelytics.com.ar',
    path: '/v2/latest'
  };

  return new Promise(function(resolve, reject) {
    var req = http.request(options, function(res) {
      var str = '';

      res.on('data', function(chunk) {
        str += chunk;
      });

      res.on('end', function() {

        // Set up return object
        var ret = {};
        var data;
        ret.date = new Date();
        ret.source = {
          name: options.name,
          uri: 'http://' + options.host + options.path
        };

        // Parse response from Bluelytics
        try {
          data = JSON.parse(str);
        } catch (err) {
          return cb('Bad JSON from ' + options.host + options.path + ':' + err + '\n' + str);
        }

        ret.data = Object.keys(data).filter(function(key) {
            return key !== 'last_update';
          })
          .reduce(function(mem, key) {
            var item = data[key];
            return Object.assign({}, mem, {
              [key]: Object.assign({}, item, {
                date: data.last_update,
                source: key,
              }),
            });
          }, {});

        resolve(ret);
      });
    });

    req.end();

    req.on('error', function(e) {
      reject(e);
    });
  });

}

// Public API for this package
exports.getData = function(cb) {
  return Promise.all([getFromOldAPI(), getBlue()])
    .then(function(result) {
      const old = result[0];
      const blue = result[1];

      const data = Object.assign({}, old.data, blue.data);

      cb(null, data);
    })
    .catch(function(e) {
      cb(e);
    });
};
