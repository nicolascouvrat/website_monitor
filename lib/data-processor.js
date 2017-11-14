
class DataProcessor {
  constructor(url, dataService, options) {
    options = options || {};

    this.errorList = options.errorList || ['4xx', '5xx'];

    this.dataService = dataService;
    this.url = url;

    // bindings
    this.processError = this.processError.bind(this);
    this.processSuccess = this.processSuccess.bind(this);
  }

  /**
   * Process the results of a curl success
   * @param {Number} statusCode
   * @param {String} body
   * @param {String} headers
   * @public
   */

  processSuccess(statusCode, body, headers, info) {
    if (this.isErrorCode(statusCode)) {
      // we then redirect towards processError()
      this.processError(new Error("Bad HTTP code (defined in DataProcessor)"), statusCode);
      return;
    };
    var data = {};
    data.timestamp = new Date();
    data.value = 1; //success
    data.code = statusCode;
    // this can be modified later on to add more interesting info :)
    data.details = {
      totalTime: info.totalTime
    }
    // save data
    this.export(data);
  }

  /**
   * Process the results of a curl error
   * (timeout for instance)
   * see https://curl.haxx.se/libcurl/c/libcurl-errors.html for a list of errors
   * OR
   * process the result of a user defined error (defined via this.errorList)
   * @param {Error} error
   * @param {Number} errorCode
   * @public
   */

  processError(error, errorCode) {

    var data = {};
    data.timestamp = new Date();
    data.value = 0; //error
    data.code = errorCode;
    // this can be modified later to add more interesting info :)
    data.details = {
      errorMessage: error.message
    }
    // save data
    this.export(data);
  }

  /**
   * Compare an HTTP status code against the user defined errorList
   * (HTTP codes considered to be equivalent to "unavailable website")
   * @param {Number} statusCode
   * @private (api)
   */

  isErrorCode(statusCode) {
    for ( var i = 0; i < this.errorList.length; i++) {
      if (this.match(this.errorList[i], statusCode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Test matching between an error code and a reference
   * (since the reference syntax accepts the 'x' joker)
   * @param {String} reference
   * @param {Number} test
   * @private (api)
   */
  match(reference, test) {
    reference = reference.replace(/x/gi, '[0-9]');
    return new RegExp(reference).test(test);
  }

  /**
   * Export processed data (save to DB & pipe to AvailabilityMonitor)
   * @param {Object} data
   * @private (api)
   */
  export(data) {
    // DB save
    this.dataService.save(this.url, data);
    if (this.publish) {
      var availabilityData = {
        timestamp: data.timestamp,
        value: data.value
      }
      this.publish(availabilityData);
    }
  }

  /**
   * Saves an AvailabilityMonitor as a target for data.availability redirection
   * @param {AvailabilityMonitor} availabilityMonitor
   * @public
   */
  pipeInto(availabilityMonitor) {
    this.publish = availabilityMonitor.sink;
  }

}

module.exports = DataProcessor;
