const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const DataProcessor = require('../lib/data-processor');
const AvailabilityMonitor = require('../lib/availability-monitor');
const DataService = require('../lib/data.service');


describe('The DataProcessor module: ', function() {

  it("Matches error codes, and handles the 'x' joker (case insensitive)", function() {
    const dummyDataService = new DataService();
    var dataProcessor = new DataProcessor("www.google.com", dummyDataService);

    var firstTest = dataProcessor.match('40x', 401);
    var secondTest = dataProcessor.match('3xX', 345);
    var thirdTest = dataProcessor.match('500', 345);

    expect(firstTest).to.be.equal(true);
    expect(secondTest).to.be.equal(true);
    expect(thirdTest).to.be.equal(false);
  });

  it("Checks an HTTP code against a list of user-defined error codes", function() {
    const dummyDataService = new DataService();
    var dataProcessor = new DataProcessor("www.google.com", dummyDataService, {errorList: ['3xx', '500', '40X']});

    var firstTest = dataProcessor.isErrorCode(301);
    var secondTest = dataProcessor.isErrorCode(200);
    var thirdTest = dataProcessor.isErrorCode(411);

    expect(firstTest).to.be.equal(true);
    expect(secondTest).to.be.equal(false);
    expect(thirdTest).to.be.equal(false);
  });

  it("redirects a curl success to processError() if it matches user-defined list", function() {
    const dummyDataService = new DataService();
    const processErrorStub = this.sandbox.stub(DataProcessor.prototype, 'processError')
    const exportStub = this.sandbox.stub(DataProcessor.prototype, 'export');
    var dataProcessor = new DataProcessor("www.google.com", dummyDataService);
    // errors are 4xx and 5xx

    dataProcessor.processSuccess(404, null, null, {totalTime: 100});

    expect(processErrorStub).to.have.been.calledOnce;
    expect(exportStub).to.have.callCount(0);
  });

  it("exports a curl success as a data object otherwise", function() {
    const dummyDataService = new DataService();
    const processErrorStub = this.sandbox.stub(DataProcessor.prototype, 'processError')
    const exportStub = this.sandbox.stub(DataProcessor.prototype, 'export');
    var now = new Date();
    var dataProcessor = new DataProcessor("www.google.com", dummyDataService);
    this.clock = sinon.useFakeTimers(now.getTime());

    dataProcessor.processSuccess(200, null, null, {totalTime: 50});

    //expected result
    var result = {
      timestamp: now,
      value: 1,
      code: 200,
      details: {
        totalTime: 50
      }
    }

    expect(processErrorStub).to.have.callCount(0);
    expect(exportStub).to.have.been.calledWith(result);

    this.clock.restore();
  });

  it("exports a curl error (or a an error due to the user-defined http error codes) as a data object", function() {
    const dummyDataService = new DataService();
    const exportStub = this.sandbox.stub(DataProcessor.prototype, 'export');
    var now = new Date();
    var dataProcessor = new DataProcessor("www.google.com", dummyDataService);
    this.clock = sinon.useFakeTimers(now.getTime());

    dataProcessor.processError(new Error("error!"), 28);
    // expected result
    var result = {
      timestamp: now,
      value: 0,
      code: 28,
      details: {
        errorMessage: "error!"
      }
    }

    expect(exportStub).to.have.been.calledWith(result);

    this.clock.restore();
  });

  it("sends a data object to the database, and availability info to the AvailabilityMonitor if it exists", function() {
    const saveStub = this.sandbox.stub(DataService.prototype, 'save');
    const sinkStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'sink');
    const dummyDataService = new DataService();
    var dataProcessor = new DataProcessor("www.google.com", dummyDataService);
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");
    var now = new Date();

    var test = {
      timestamp: now,
      value: 1,
      code: 200,
      details: {
        totalTime: 30,
        paramsDontMatter: 'a value' // params can be added later
      }
    }

    dataProcessor.export(test);
    dataProcessor.pipeInto(availabilityMonitor);
    dataProcessor.export(test);

    expect(saveStub).to.have.callCount(2);
    expect(sinkStub).to.have.callCount(1);
    expect(saveStub).to.have.been.calledWith("www.google.com", test);
    expect(sinkStub).to.have.been.calledWith({
      timestamp: test.timestamp,
      value: test.value
    });
  });

})
