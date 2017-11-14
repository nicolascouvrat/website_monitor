const DataProcessor = require('./data-processor');
const RequestGenerator = require('./request-generator');
const AvailabilityMonitor = require('./availability-monitor');

class Website {
  constructor(url, tick, dataService, options) {
    options = options || {}
    if (url === "") {
      throw new Error("Website: url should not be empty!");
    }
    //NOTE: tick in milliseconds!

    this.dataProcessor = new DataProcessor(url, dataService, options.dataProcessorOptions);
    this.requestGenerator = new RequestGenerator(url, tick, options.requestOptions);
    this.availabilityMonitor = new AvailabilityMonitor(url);
    this.dataService = dataService;
    this.url = url;

    // bindings
    this.startMonitoring = this.startMonitoring.bind(this);
    this.requestSuccess = this.requestSuccess.bind(this);
    this.requestError = this.requestError.bind(this);

  }

  /**
   * Behavior when RequestGenerator completes a curl call successfully
   * ('end' event)
   * @param {Number} statusCode
   * @param {HTTP body} body
   * @param {HTTP headers} headers
   * @param {Number} totalTime
   * @private (api)
   */

  requestSuccess(statusCode, body, headers, info) {
    this.dataProcessor.processSuccess(statusCode, body, headers, info);
  }

  /**
   * Behavior when RequestGenerator returns a curl errors
   * ('error' event)
   * @param {Error} error
   * @param {Number} errorCode
   * @private (api)
   */

  requestError(error, errorCode) {
    this.dataProcessor.processError(error, errorCode);
  }

  /**
   * starts monitoring the website
   * @public
   */

  startMonitoring() {
    this.dataService.new(this.url);
    this.requestGenerator.start(this.requestError, this.requestSuccess);
    // make the monitor watch the processor
    this.availabilityMonitor.watch(this.dataProcessor);
  }
}

module.exports = Website;
