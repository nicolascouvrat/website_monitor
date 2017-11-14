const Queue = require('queue-fifo')
const fs = require('fs')
var debug = require('debug')


class AvailabilityMonitor {
  constructor (url, options) {
    options = options || {}

    this.timeSpan = options.timeSpan || 120; // in seconds, default to 2mins
    this.availabilityTreshold = options.availabilityTreshold || 0.8
    this.saveToFile = options.saveToFile || true //save output to file
    this.fileName = (options.fileName || this.trimUrl(url)) + ".txt";

    this.queue = new Queue();
    this.sum = undefined;
    this.alertFlag = false;
    this.url = url;

    //bindings
    this.sink = this.sink.bind(this);
  }

  /**
   * Saves a string as a line in this.fileName
   * @param {String}
   */
  saveInFile(string) {
    try {
      fs.appendFile(this.fileName, string + "\n")
    } catch(error) {
      console.error("AvailabilityMonitor: error when saving file", this.fileName, ": ", error);
    }
  }

  /**
   * Utility method that refactors an url into a valid LINUX filename
   * (stripping all slashes)
   * @param {String} url
   * @returns {String}
   * @private (api)
   */

  trimUrl(url) {
    var tmp = url.replace(/http:\/\//, '');
    return tmp.replace(/\//g, "_");
  }

  /**
   * Initializes the monitor by starting to watch a dataProcessor
   * @param {DataProcessor} dataProcessorOptions
   * @public
   */
  watch(dataProcessor) {
    this.dataProcessor = dataProcessor;
    this.dataProcessor.pipeInto(this);
  }

  /**
   * Receives incoming data from the dataProcessor
   * @param {Object} availabilityData - containing {Date} timestamp and {Number} value 0 or 1
   * @public
   */

  sink(availabilityData) {
    // add to Queue
    this.queue.enqueue(availabilityData);
    if (this.sum === undefined) {
      this.sum = availabilityData.value;
    } else {
      this.sum += availabilityData.value;
    }
    // remove from queue if queue spans over more time than this.timeSpan
    var oldest = this.queue.peek();
    while (availabilityData.timestamp.getTime() - oldest.timestamp.getTime() > this.timeSpan * 1000) {
      this.queue.dequeue();
      this.sum -= oldest.value;
      oldest = this.queue.peek();
    }

    this.alertLogic();
  }

  /**
   * Compute the availability over (approximately) the last 2minutes
   * @returns {Number} availability between 0 and 1
   * @private (api)
   */
  get availability() {
    return this.sum / this.queue.size();
  }

  /**
   * Prettier alert formating
   * @param {Date} date
   * @returns {String}
   * @private (api)
   */
  prettyDate(date) {
    return date.toISOString().replace(/T/, ' ').replace(/\..+/, '') + "(UTC)";
  }

  /**
   * When raising alert flag
   * @private (api)
   */
  raiseAlert() {
    var now = new Date();
    var string =  "ALERT: website {" +
      this.url +
      "} is down. Availability: " +
      this.availability.toFixed(2) +
      " (time: " + this.prettyDate(now) + ")";
    console.info(string);
    if (this.saveToFile) {
      this.saveInFile(string);
    }

  };

  /**
   * When alert flag is being lowered
   * @private (api)
   */
  resolveAlert() {
    var now = new Date();
    var test = "INFO: website {" +
      this.url +
      "} is running again. (solved at: " +
      this.prettyDate(now) + ")";
    console.info(test);
    if (this.saveToFile) {
      this.saveInFile(test);
    }
  }


  /**
   * Alerting logic. Will raise alert if when we CROSS threshold going down
   * (i.e. not when we stay below it)
   * and resolve alert when we CROSS the threshold going up
   * @private (api)
   */
  alertLogic() {
    //TODO: put this as debug message
    debug("new input ! availability is now: " + this.availability);
    if (this.availability < 0.8 && !this.alertFlag) {
      this.alertFlag = true;
      this.raiseAlert();
    }

    if (this.availability > 0.8 && this.alertFlag) {
      this.alertFlag = false;
      this.resolveAlert();
    }
  }
}

module.exports = AvailabilityMonitor;
