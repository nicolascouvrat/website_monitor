const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const MockDatabase = require('../lib/mock-database');
const Queue = require('queue-fifo')

describe("The MockDatabase module: ", function() {

  it("creates a new entry in the database for a given url with a maximum save duration(default 1hr)", function() {
    var mockDatabase = new MockDatabase();

    mockDatabase.new("www.test.com");
    mockDatabase.new("www.google.com", 2000);

    // expected results
    var result = {
      'www.test.com': {
        queue: new Queue(),
        timeSpan: 3600
      },
      'www.google.com': {
        queue: new Queue(),
        timeSpan: 2000
      }
    }

    expect(mockDatabase.data).to.deep.equal(result);
  });

  it("throws an error if trying to save to non existent data field", function() {
    var mockDatabase = new MockDatabase();
    expect(function(){
      mockDatabase.save("www.google.com", {});
    }).to.throw(Error);
  })

  it("maintains data of the last timeSpan seconds (default 3600) in the appropriate data field", function() {
    var mockDatabase = new MockDatabase();
    var now = new Date();
    var second = new Date(now.getTime() + 30 * 1000);
    var third = new Date(now.getTime() + 130 * 1000);
    var fourth = new Date(now.getTime() + 260 * 1000);
    var dummyData = function(timestamp) {
      return {
        timestamp: timestamp,
        value: 1,
        code: 200,
        details: {
          totalTime: 100
        }
      }
    }
    var dummyUrl = "www.google.com";

    mockDatabase.data[dummyUrl] = {
      queue: new Queue(),
      timeSpan: 120
    };
    mockDatabase.save(dummyUrl, dummyData(now));
    mockDatabase.save(dummyUrl, dummyData(second));
    var firstTest = mockDatabase.data[dummyUrl].queue.size();

    mockDatabase.save(dummyUrl, dummyData(third));
    var secondTest = mockDatabase.data[dummyUrl].queue.size();

    mockDatabase.save(dummyUrl, dummyData(fourth));
    var thirdTest = mockDatabase.data[dummyUrl].queue.size();

    //expected results
    var firstResult = 2;
    var secondResult = 2;
    var thirdResult = 1;

    expect(firstTest).to.be.equal(firstResult);
    expect(secondTest).to.be.equal(secondResult);
    expect(thirdTest).to.be.equal(thirdResult);
  });

  it("throws an error if trying to access a non existent data field", function() {
    var mockDatabase = new MockDatabase();
    expect(function() {
      mockDatabase.getOver("www.google.com", 2000);
    }).to.throw(Error);
  });

  it("throws an error if trying to get data over a duration longer than the timeSpan specified at field creation", function(){
    var mockDatabase = new MockDatabase();
    mockDatabase.data['www.google.com'] = {
      queue: new Queue(),
      timeSpan: 120
    };
    expect(function() {
      mockDatabase.getOver("www.google.com", 200);
    });
  });

  it("returns a list of all data over the past duration seconds", function() {
    var mockDatabase = new MockDatabase();
    var dummyUrl = 'www.google.com';
    var now = new Date();
    var first = new Date(now.getTime() - 10 * 1000);
    var second = new Date(now.getTime() - 300 * 1000);
    var third = new Date(now.getTime() - 1300 * 1000);
    var fourth = new Date(now.getTime() - 2600 * 1000);
    this.clock = sinon.useFakeTimers(now);
    var dummyData = function(timestamp) {
      return {
        timestamp: timestamp,
        value: 1,
        code: 200,
        details: {
          totalTime: 100
        }
      }
    }
    mockDatabase.data['www.google.com'] = {
      queue: new Queue(),
      timeSpan: 3600
    };
    mockDatabase.data[dummyUrl].queue.enqueue(dummyData(fourth));
    mockDatabase.data[dummyUrl].queue.enqueue(dummyData(third));
    mockDatabase.data[dummyUrl].queue.enqueue(dummyData(second));
    mockDatabase.data[dummyUrl].queue.enqueue(dummyData(first));

    var firstTest = mockDatabase.getOver(dummyUrl, 1300);
    var secondTest = mockDatabase.getOver(dummyUrl, 2700);
    var thirdTest = mockDatabase.getOver(dummyUrl, 5);

    //expected results
    var firstResult = [
      dummyData(first),
      dummyData(second),
      dummyData(third)
    ];
    var secondResult = [
      dummyData(first),
      dummyData(second),
      dummyData(third),
      dummyData(fourth)
    ];
    var thirdResult = []

    expect(firstTest).to.deep.equal(firstResult);
    expect(secondTest).to.deep.equal(secondResult);
    expect(thirdTest).to.deep.equal(thirdResult);

    this.clock.restore();
  });

  it("Checks if the database contains a field corresponding to a specified url", function(){
    var mockDatabase = new MockDatabase();
    mockDatabase.data['www.google.com'] = {
      queue: new Queue(),
      timeSpan: 3600
    };

    var firstTest = mockDatabase.hasEntry("www.test.com");
    var secondTest = mockDatabase.hasEntry("www.google.com");

    expect(firstTest).to.equal(false);
    expect(secondTest).to.equal(true);
  })

})
