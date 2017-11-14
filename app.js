const DataService = require('./lib/data.service');
const Website = require('./lib/website');
const StatisticsPanel = require('./lib/statistics-panel');

const DATA_SERVICE = new DataService();
var url = "http://192.168.112.148:3000";
var options = {
  requestOptions: {
    timeout: 2000
  },
  // dataProcessorOptions: {
  //   errorList: ['2xX']
  // }
}
var statsOpts = {
  scanList: [
    {delay: 10, amplitude: 60},
    {delay: 30, amplitude: 120}
  ]
}

exports.stat = new StatisticsPanel(DATA_SERVICE, statsOpts);
exports.myWebsite = new Website(url, 5000, DATA_SERVICE, options);
exports.myWebsite2 = new Website("www.google.com", 29000, DATA_SERVICE);
exports.data = DATA_SERVICE;
exports.url = url;
