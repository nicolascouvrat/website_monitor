const debug = require('debug');

class StatisticsPanel {
  constructor(dataService, options) {
    options = options || {};

    this.dataService = dataService;
    this.trackedWebsites = [];
    this.scanList = options.scanList || [
      {delay: 10, amplitude: 600}, // 10min amplitude scan every 10s
      {delay: 60, amplitude: 3600} // 1hr amplitude scan every 1min
    ];
    this.intervalList = [];

    //bindings
    this.track = this.track.bind(this);
    this.start = this.start.bind(this);

  }

  /**
   * Adds an url to the list of websites tracked by the panel,
   * after checking that they are indeed registered in the database
   * @param {String} url
   * @public
   */
  track(url) {
    if (this.dataService.hasEntry(url)) {
      this.trackedWebsites.push(url);
    }
  }

  /**
   * Scans all websites in the tracking list every delay seconds,
   * asking for data over amplitude seconds
   * @param {Number} delay in seconds
   * @param {Number} amplitude in seconds
   * @private (api)
   */
  setAllIntervals(delay, amplitude) {
    var interval = setInterval(
      () => {
        this.scanAll(amplitude)
      },
      delay * 1000
    );
    this.intervalList.push(interval);
  }

  /**
   * Scans all websites in tracking list, asking for data over amplitude seconds
   * @param {Number} amplitude in seconds
   * @private (api)
   */
  scanAll(amplitude) {
    console.info("### SCAN REPORT (amplitude: " + amplitude + " s) ###");
    for (var i = 0; i < this.trackedWebsites.length; i++) {
      var url = this.trackedWebsites[i];
      var data = this.dataService.getOver(url, amplitude);
      debug("data", data);
      var statistic = this.processData(data);
      debug("stat", statistic);
      // print it out
      console.info("   " + this.prettyStatistics(url, amplitude, statistic));
    }
    console.info("### ------ ###")
  }

  /**
   * Processes data for one website and makes a statistics object out of it
   * (for now:)
   *  min / max success times
   *  avg success time
   *  availability
   *  TODO: add error code averaging?
   * @param {[Object]} dataList
   * @returns {Object}
   * @private (api)
   *
   * NOTE: currently expected dataList formating
   * [dataObject] where dataObject contains:
   *  .timestamp
   *  .value
   *  .code
   *  .details
   *    .totalTime (if value is 1) (in milliseconds)
   *    .errorMessage (if value is 0)
   */
  processData(dataList) {
    var availability = undefined;
    var averageSuccessTime = undefined;
    var numberOfSuccesses = 0;
    var numberOfFailures = 0;
    var maxSuccessTime = undefined;
    var minSuccessTime = undefined;
    var totalSuccessTime = 0;

    for (var i = 0; i < dataList.length; i++) {
      var item = dataList[i];
      if (item.value === 1) {
        var time = item.details.totalTime;
        numberOfSuccesses += 1;

        if (maxSuccessTime === undefined) {
          maxSuccessTime = time;
        } else {
          if (time > maxSuccessTime) {
            maxSuccessTime = time;
          }
        }

        if (minSuccessTime === undefined) {
          minSuccessTime = time;
        } else {
          if (time < minSuccessTime) {
            minSuccessTime = time;
          }
        }

        totalSuccessTime += time;
      }

      else {
        numberOfFailures += 1;
      }
    }

    if (numberOfSuccesses + numberOfFailures > 0) {
      availability = numberOfSuccesses / (numberOfFailures + numberOfSuccesses);
    }

    if (numberOfSuccesses > 0) {
      averageSuccessTime = totalSuccessTime / numberOfSuccesses;
    }

    var statistic = {
      availability: availability,
      averageSuccessTime: averageSuccessTime,
      maxSuccessTime: maxSuccessTime,
      minSuccessTime: minSuccessTime
    }

    return statistic;
  }

  /**
   * Creates a "pretty" string out a statistic object.
   * @param {String} url
   * @param {Number} amplitude scan amplitude in seconds
   * @param {Object} statistic
   * @returns {String}
   * @private (api)
   */
  prettyStatistics(url, amplitude, statistic) {
    //sanity check
    var availability = statistic.availability !== undefined ? statistic.availability.toFixed(2) : 'NO_DATA';
    var avgSuccessTime = statistic.averageSuccessTime !== undefined ? statistic.averageSuccessTime.toFixed(1) + " (ms)" : 'NO_DATA';
    var maxSuccesTime = statistic.maxSuccessTime !== undefined ? statistic.maxSuccessTime.toFixed(1) + " (ms)" : 'NO_DATA';
    var minSuccessTime = statistic.minSuccessTime !== undefined ? statistic.minSuccessTime.toFixed(1) + " (ms)" : 'NO_DATA';

    var string = "Statistics for the website "
      + url
      + " over the last "
      + amplitude
      + " seconds: "
      + "availability=" + availability + " | "
      + "average success time=" + avgSuccessTime + " | "
      + "max success time=" + maxSuccesTime + " | "
      + "min success time=" + minSuccessTime
    return string;
  }

  /**
   * Start the statistics panel
   * @public
   */
  start() {
    for (var i = 0; i < this.scanList.length; i++) {
      var delay = this.scanList[i].delay;
      var amplitude = this.scanList[i].amplitude;
      this.setAllIntervals(delay, amplitude);
    }
  }

}

module.exports = StatisticsPanel;
