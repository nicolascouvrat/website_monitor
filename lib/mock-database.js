const Queue = require('queue-fifo');
const debug = require('debug');

/*
 * The MockDatabase class is used to make up for the lack of database in the first version
 * Since everything is stored in cache, choice has been made to not keep any superfluous data
 * (i.e. everything over the one hour range)
 *
 * In order to be able to test the length (time wise) of the stored data and delete/add
 * elements accordingly, a Queue implementation is used to use a O(1) .save() function
 * Since we want this class to return a {[Object]} array of stored data, this does come
 * at the cost of a O(n) getOver() function (time needed to convert the double linked list
 * Queue to an array) -- where n is equal to x * d,
 * x being the number of saves per minutes and d the duration in minutes.
 *
 * This tradeoff is based on the idea that we call save() more often than getOver()
 * (at least more often that getOver() on long durations)
 * Moreover, the size of the stored queue should be of order 10 ^ 3 ~ 10 ^ 4
 * (assuming we do not probe faster than once every 100ms)
 *
 * NOTE: the typical size of one data token is approximately 100 bytes
 * (evaluated roughly by counting the number of characters in the JSON representation)
 * Assuming 'x' saves per minutes and 'N' tracked websites, stored data will take:
 *  => S = 60 * 100 * x * N = 6N * x kB
 *
 * e.g.: 1 probe every 10s (x = 6) and N = 100 yields S = 3.6 MB
 */

class MockDatabase {
  constructor() {
    this.data = {};

    //bindings
    this.save = this.save.bind(this);
    this.new = this.new.bind(this);
    this.getOver = this.getOver.bind(this);
    this.hasEntry = this.hasEntry.bind(this);
  };

  /**
   * Creates a new entry in the database for website of given url
   * @param {String} url
   * @param {Number} timeSpan - in seconds (default to 3600 seconds)
   * @public
   */

  new(url, timeSpan) {
    debug("calling new");
    debug("url: " + url);
    timeSpan = timeSpan || 3600;
    if (this.data[url]) {
      console.info("INFO: such an url already exists in the database. Overwriting...")
      this.data[url] = {
        queue: new Queue(),
        timeSpan: timeSpan
      }
      console.info("done.");
      return;
    }
    this.data[url] = {
      queue: new Queue(),
      timeSpan: timeSpan
    }
  }

  /**
   * Saves data in the mock database for the url entry
   * Uses a queue / double linked list implementation to not save more than necessary
   * (since everything is stored in cache for now)
   * @param {String} url
   * @param {Object} data
   * @public
   */
  save(url, data) {
    if (this.data[url] === undefined) {
      throw new Error("MockDatabase: that url does not exist in the database! Please create it first.");
    }
    this.data[url].queue.enqueue(data);
    // remove from queue if queue spans more than the timeSpan (default of one hour)
    var oldest = this.data[url].queue.peek();
    while (data.timestamp.getTime() - oldest.timestamp.getTime() > this.data[url].timeSpan * 1000) {
      this.data[url].queue.dequeue();
      oldest = this.data[url].queue.peek();
    }
  }

  /**
   * Returns the appropriate array, mimicking database Behavior
   * NOTE: can only accept a duration parameter equal to timeSpan or inferior
   *    -- plan being that the real database will accept an arbitrary duration
   * NOTE: converting to an array here is a straight loss in terms of time/space complexity,
   * but the reason for it is to mimick database behavior (that will return a array) so that
   * the rest of the code requires little to no modification when switching to a real database
   *
   * @param {Number} duration (in seconds!)
   * @param {String} url
   * @returns {[Object]} -- the array of all data saved for the last duration SECONDS(!)
   * @public
   */
  getOver(url, duration) {
    if (this.data[url] === undefined) {
      throw new Error("MockDatabase: that url does not exist in the database! Please create it first.");
    }
    if (duration > this.data[url].timeSpan) {
      throw new Error("MockDatabase: getOver() duration has to be inferior or equal to"
       + this.data[url].timeSpan + "seconds!");
    }
    var list = this.data[url].queue._list;
    var array = [];
    var now = new Date();
    list.forEach(function(node) {
      if (now.getTime() - node.getData().timestamp.getTime() > duration * 1000) {
        list.interruptEnumeration();
        return;
      }
      array.push(node.getData());
    }, true);
    return array;
  }

  /**
   * Checks if an entry corresponding to the requested url exists in the mockDatabase
   * @param {String} url
   * @returns {Boolean}
   * @public
   */
  hasEntry(url) {
    return !(this.data[url] === undefined)
  }
}

module.exports = MockDatabase;
