const Queue = require('queue-fifo')
var debug = require('debug');

class AvailabilityMonitor {
  constructor (url) {
    this.timeSpan = 120; // in seconds
    this.queue = new Queue();
    this.sum = undefined;
    this.availabilityTreshold = 0.8;
    this.alertFlag = false;
    this.url = url;
    //TODO: let user define that time span? as well as threshold?

    //bindings
    this.sink = this.sink.bind(this);
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
    console.error(
      "ALERT: website {" +
      this.url +
      "} is down. Availability: " +
      this.availability.toFixed(2) +
      " (time: " + this.prettyDate(now) + ")"
    )
  };

  /**
   * When alert flag is being lowered
   * @private (api)
   */
  resolveAlert() {
    var now = new Date();
    console.info(
      "INFO: website {" +
      this.url +
      "} is running again. (solved at: " +
      this.prettyDate(now) + ")"
    );
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
