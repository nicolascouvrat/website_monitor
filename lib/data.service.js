const MockDatabase = require('./mock-database')

/*
 * all times in seconds !
 */
class DataService {
  constructor() {
    this.database = new MockDatabase();

    // bindings
    this.getOver = this.getOver.bind(this);
    this.save = this.save.bind(this);
    this.new = this.new.bind(this);
    this.hasEntry = this.hasEntry.bind(this);
  };

  /**
   * Handles error during DB transfer
   * @param {Error} error
   * @param {String} funcName
   * @private (api)
   */
  handleError(error, funcName) {
    // for now, just log it
    console.error("DataService: an error happened in function ", funcName, ": ", error);
  }

  /**
   * Creates an entry for the specified url in the DB
   * @param {String} url
   * @param {Number} timeSpan
   * @public
   */
  new(url, timeSpan) {
    try {
      this.database.new(url, timeSpan);
    } catch(error) {
      this.handleError(error, "new")
    }
  }

  /**
   * Saves data into the DB
   * @param {String} url
   * @param {Object} data
   * @public
   */
  save(url, data) {
    try {
      this.database.save(url, data);
    } catch(error) {
      this.handleError(error, "save");
    }
  }

  /**
   * Gets data from DB over the specified duration
   * @param {String} url
   * @param {Number} duration - in seconds !!
   * @returns {[Object]} data
   * @public
   */

  getOver(url, duration) {
    // duration has to be inferior to value passed in new()
    // the error checking is done on the database side
    try {
      var data = this.database.getOver(url, duration);
    } catch(error) {
      this.handleError(error, "getOver");
    }
    return data;
  }

  /**
   * Checks if entry of url exists in DB
   * @param {String} url
   * @returns {Boolean}
   * @public
   */
  hasEntry(url) {
    try {
      var has = this.database.hasEntry(url);
    } catch(error) {
      this.handleError(error, "hasEntry");
    }
    return has;
  }
}

module.exports = DataService;
