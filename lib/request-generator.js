const Curl = require('node-libcurl').Curl;

class RequestGenerator {

  constructor(url, tick, options) {
    options = options || {};

    // sanity checks
    if (url === "") {
      throw new Error("RequestGenerator: URL should not be empty!")
    }
    if (!Number.isInteger(tick)) {
      throw new TypeError("RequestGenerator: tick should be an integer!");
    }
    if (options.timeout && !Number.isInteger(options.timeout)) {
      throw new TypeError("RequestGenerator: options.timeout should be an integer!");
    }

    this.url = url;
    // tick given in milliseconds
    this.tick = tick;
    this.curl = new Curl();

    // curl options
    this.followLocation = options.followLocation || true;
    this.timeout = options.timeout === undefined ? 20000 : options.timeout;
    //timeout also in milliseconds
    this.nobody = options.nobody || true;
    // if it takes more than 20s to get the page,
    // we consider it as good as being offline
    if (tick <= this.timeout) {
      // note that we still give the user possibility to set timeout to 0 (no timeout)
      // in that case, this test will always be true,
      // we assume the user takes responsability for curl errors if he manually sets no TIMEOUT
      throw new Error("RequestGenerator: tick value must be strictly greater than curl timeout value(" + this.timeout + "s)");
    }

    // set options
    this.curl.setOpt('URL', this.url);
    this.curl.setOpt('FOLLOWLOCATION', this.followLocation);
    this.curl.setOpt('TIMEOUT_MS', this.timeout)
    this.curl.setOpt('NOBODY', this.nobody);

    // bindings
    this.stop = this.stop.bind(this);
    this.start = this.start.bind(this);
  }

  /**
   * Start request chain
   * @private (api)
   */

  loop() {
    this.intervalPerform = setInterval(
      () => {
        try {
          this.curl.perform();
        } catch(error) {
          // this will catch the "Handle already running" errors
          // should not happen UNLESS user manually sets timeout to 0 (no timeout)
          // NOTE: do we keep that no timeout option? makes little sense if we want to test availability
          // (since we probably don't want the user to wait too long for loading anyway)

          // fail silently?
          console.log("handle already running error");
        }
      },
      this.tick
    )
  }

  /**
   * Start the request generator - will make curl requests
   * to specified url every tick milliseconds.
   * Will execute errorCallback on curl 'error' and callback on curl 'end'
   * @param {function} errorCallback
   * @param {function} callback
   * @public
   */

  start(errorCallback, callback) {
    var that = this;
    this.curl.on('end', function(statusCode, body, headers) {
      // in case of success, include some timing info
      // TODO: add other infos?
      var totalTime = that.curl.getInfo('TOTAL_TIME') * 1000;
      var info = {totalTime: totalTime};
      callback(statusCode, body, headers, info);
    });
    this.curl.on('error', errorCallback);
    this.loop();
  }

  /**
   * Stop the request generator and closes curl
   * @public
   */

  stop() {
    clearInterval(this.intervalPerform);
    this.curl.close();
  }
}

module.exports = RequestGenerator
