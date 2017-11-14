const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const AvailabilityMonitor = require('../lib/availability-monitor');
const DataProcessor = require('../lib/data-processor')
chai.use(require('sinon-chai'));

describe("The AvailabilityMonitor module: ", function() {
  it("watches a given DataProcessor", function() {
    const pipeIntoStub = this.sandbox.stub(DataProcessor.prototype, 'pipeInto');
    var dataProcessor = new DataProcessor;
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");

    availabilityMonitor.watch(dataProcessor);

    expect(availabilityMonitor.dataProcessor).to.deep.equal(dataProcessor);
    expect(pipeIntoStub).to.have.been.calledWith(availabilityMonitor);
  });

  it("maintains availabilityData over the last timeSpan seconds (default 120) and triggers alertLogic()", function() {
    const alertLogicStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'alertLogic');
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");
    var now = new Date();
    var second = new Date(now.getTime() + 30 * 1000);
    var third = new Date(now.getTime() + 130 * 1000);
    var fourth = new Date(now.getTime() + 260 * 1000);

    availabilityMonitor.sink({timestamp: now, value: 1});
    availabilityMonitor.sink({timestamp: second, value: 0});
    var firstTest = {sum: availabilityMonitor.sum, queueLength: availabilityMonitor.queue.size()}

    availabilityMonitor.sink({timestamp: third, value: 0});
    var secondTest = {sum: availabilityMonitor.sum, queueLength: availabilityMonitor.queue.size()};

    availabilityMonitor.sink({timestamp: fourth, value: 1});
    var thirdTest = {sum: availabilityMonitor.sum, queueLength: availabilityMonitor.queue.size()};

    // expected results
    var firstResult = {sum: 1, queueLength: 2};
    var secondResult = {sum: 0, queueLength: 2};
    var thirdResult = {sum: 1, queueLength: 1};

    expect(firstTest).to.deep.equal(firstResult);
    expect(secondTest).to.deep.equal(secondResult);
    expect(thirdTest).to.deep.equal(thirdResult);
    expect(alertLogicStub).to.have.callCount(4);
  });

  it("computes availability", function() {
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");
    var now = new Date();
    var dummyElement = {timestamp: now, value: 1};
    for (var i = 0; i < 5; i++) {
      availabilityMonitor.queue.enqueue(dummyElement);
    }
    availabilityMonitor.sum = 3;

    expect(availabilityMonitor.availability).to.be.equal(3/5);
  });

  it("raises alert if flag is down and availability below threshold", function() {
    const getAvailabilityStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'availability')
    .get(function() {
      return 0.7;
    });
    const raiseAlertStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'raiseAlert');
    const resolveAlertStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'resolveAlert');
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");

    availabilityMonitor.alertLogic();

    expect(raiseAlertStub).to.have.been.calledOnce;
    expect(resolveAlertStub).to.have.callCount(0);

  });

  it("resolves alert if flag is up and availability over threshold", function() {
    const getAvailabilityStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'availability')
    .get(function() {
      return 0.9;
    });
    const resolveAlertStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'resolveAlert');
    const raiseAlertStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'raiseAlert');
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");
    availabilityMonitor.alertFlag = true;

    availabilityMonitor.alertLogic();

    expect(resolveAlertStub).to.have.been.calledOnce;
    expect(raiseAlertStub).to.have.callCount(0);

  })

  it("prints (a pretty!) alert message", function() {
    var now = new Date();
    const getAvailabilityStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'availability')
    .get(function() {
      return 0.77777;
    });
    const consoleErrorStub = this.sandbox.stub(console, 'error');
    this.clock = sinon.useFakeTimers(now);
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");

    // expected result
    var string = "ALERT: website {www.google.com} is down. Availability: 0.78 (time: "
      + availabilityMonitor.prettyDate(now)
      + ")";

    availabilityMonitor.raiseAlert();
    expect(consoleErrorStub).to.have.been.calledWith(string);

    this.clock.restore();
  });

  it ("prints (a pretty!) info message", function() {
    var now = new Date();
    const getAvailabilityStub = this.sandbox.stub(AvailabilityMonitor.prototype, 'availability')
    .get(function() {
      return 0.7;
    });
    const consoleInfoStub = this.sandbox.stub(console, 'info');
    this.clock = sinon.useFakeTimers(now);
    var availabilityMonitor = new AvailabilityMonitor("www.google.com");

    // expected result
    var string = "INFO: website {www.google.com} is running again. (solved at: "
      + availabilityMonitor.prettyDate(now)
      + ")";

    availabilityMonitor.resolveAlert();
    expect(consoleInfoStub).to.have.been.calledWith(string);

    this.clock.restore();
  })
})
