const DataService = require('./lib/data.service');
const Website = require('./lib/website');
const StatisticsPanel = require('./lib/statistics-panel');
const fs = require('fs');

var logFolder = './.availability_log'
var url = "http://192.168.112.148:3000";
var watchOpts = {
  requestOptions: {
    timeout: 2000
  },
}
var statsOpts = {
  scanList: [
    {delay: 10, amplitude: 60},
    {delay: 30, amplitude: 120}
  ]
}
var statisticsPanel = {};
var watchedList = [];
const DEFAULT_WATCH_OPTS = {
  requestOptions: {
    timeout: 20000,
    followLocation: true,
    nobody: true
  },
  dataProcessorOptions: {
    errorList: [
      '4xx',
      '5xx'
    ]
  },
  availabilityMonitorOptions: {
    timeSpan: 120,
    availabilityTreshold: 0.8,
    saveToFile: true,
    fileName: 'trimmed url (no slashes)',
    filePath: './.availability_log/'
  }
}
const DEFAULT_STATS_OPTS = {
  scanList: [
    {delay: 10, amplitude: 600},
    {delay: 60, amplitude: 3600}
  ]
}

exports.help = function() {
  console.info("### LIST OF COMMANDS ###\n");
  // .watch
  console.info("   .watch(url, tick[, delayedTracking, options])"
    + " -- track a website at specified url every tick milliseconds"
    + " (see documentation for optional parameters)\n");
  // .startStatistics
  console.info("   .startStatistics() -- starts printing statistics for the tracked websites\n");
  // .getWatchedList
  console.info("   .getWatchedList() -- list of currently watched urls\n");
  // options getter
  console.info("   .getOptions() -- list of current app-wide options"
    + " (use .getDefaultOptions() to see defaults)\n")
  console.info("   .getDefaultOptions() -- list of default options"
    + " (these get owerwritten by app-wide options)\n")
  // option setter
  console.info("   .setWatchOption(option, value) -- sets watch option 'option' to"
    + " value 'value' (use '.' to access nested options)\n");
  console.info("   .setStatsOption(option, value) -- identical to .setWatchOption()"
    + " but for statistics panel options. Require .restartStatistics() to be effective\n");


  // .help
  console.info("   .help() -- print this message\n");
  console.info("### ------- ###");
}

/**
 * Non exported utility functions
 */
var init = function() {
  // create stat panel with existing opts. Will overwrite existing stat panel if option change
  statisticsPanel = new StatisticsPanel(DATA_SERVICE, statsOpts);
}

var setOption = function(target, option, value) {
  // parse option string to access deep parameters
  var optionParsed = option.split('.');
  var lastKey = optionParsed[optionParsed.length - 1];
  for (var i = 0; i < optionParsed.length - 1; i++ ) {
    target = target[optionParsed[i]]
  }
  target[lastKey] = value;
}

var prettyJSON = function(object) {
  return JSON.stringify(object, null, 3);
}


/**
 * Exports
 */

exports.startStatistics = function() {
  statisticsPanel.start();
  console.info("Statistics service now online");
}

exports.watch = function(url, tick, delayedTracking, options) {
  delayedTracking = delayedTracking || false;
  // specifying options will overwrite default options
  options = options || watchOpts;

  var website = new Website(url, tick, DATA_SERVICE, options);
  website.startMonitoring();
  console.log("Now watching website {" + url + "}, query every " + tick + " ms.");
  // add to watched list
  watchedList.push(url);
  if (!delayedTracking) {
    // we instantly register website for stats tracking
    statisticsPanel.track(url);
  }
}

exports.getWatchedList = function() {
  console.info("### LIST OF WATCHED WEBSITES ###");
  for (var i = 0; i < watchedList.length; i++) {
    console.info("   - " + watchedList[i]); //triple space
  }
  console.info("### ------ ###");
}

exports.getOptions = function() {
  var watchOptsString = prettyJSON(watchOpts);
  var statsOptsString = prettyJSON(statsOpts);
  console.info("### APP OPTIONS ###\n");
  console.info("   watch options:");
  console.info(watchOptsString);
  console.info("\n");
  console.info("   statistics panel options:");
  console.info(statsOptsString);
  console.info("### ------ ###");
}

exports.getDefaultOptions = function() {
  var defaultWatchOptsString = prettyJSON(DEFAULT_WATCH_OPTS);
  var defaultStatsOptsString = prettyJSON(DEFAULT_STATS_OPTS);
  console.info("### DEFAULT APP OPTIONS ###\n");
  console.info("   watch options:");
  console.info(defaultWatchOptsString);
  console.info('\n');
  console.info("   statistics panel options:");
  console.info(defaultStatsOptsString);
  console.info("### ------- ###");
}



exports.setWatchOption = function(option, value) {
  setOption(watchOpts, option, value);
}

exports.setStatsOption = function(option, value) {
  setOption(statsOpts, option, value);
}

/**
 * On app launch
 */
// create data service (initiate connection to DB)
console.info("Initializing connection to database...")
const DATA_SERVICE = new DataService();
console.info("done.")
// create .availability_log folder using sync (it is boot time so it's ok)
console.info("Checking for existence of " + logFolder + " folder...")
if (!fs.existsSync(logFolder)) {
  console.info('Creating ' + logFolder + '...')
  try {
    fs.mkdirSync(logFolder)
  } catch(err) {
    console.err("App: error when creating log folder ", logFolder, ": ", err);
    console.info("Unable to create log folder. Logging is likely to fail.")
  }
}
console.info("done.")
console.info("Initial setup...");
init();
console.info("done.")
console.info("Welcome to the website monitor. Use .help for a list of commands.");
