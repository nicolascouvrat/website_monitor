const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const DataProcessor = require('../lib/data-processor');
const RequestGenerator = require('../lib/request-generator')
const Website = require('../lib/website')
const DataService = require('../lib/data.service')

describe('The website module: ', function() {
  it("throws an error if an empty url is passed", function() {
    const dummyDataService = new DataService();
    expect(function() {
      var website = new Website("", 1, dummyDataService);
    }).to.throw(Error);
  });

  it("creates DB entry, then uses DataProcessor's processSuccess() if RequestGenerator returns no error", function() {
    const startStub = this.sandbox.stub(RequestGenerator.prototype, 'start')
    .callsFake(function(errorHandler, successHandler) {
      successHandler(200, null, null, {});
    });
    const processSuccessStub = this.sandbox.stub(DataProcessor.prototype, 'processSuccess')
    const newStub = this.sandbox.stub(DataService.prototype, 'new');
    const dummyDataService = new DataService();

    var website = new Website("www.google.com", 20001, dummyDataService);
    website.startMonitoring();
    expect(processSuccessStub).to.have.been.calledWith(200, null, null, {});
    expect(newStub).to.have.been.calledOnce;
    expect(newStub).to.have.been.calledWith("www.google.com");
  });

  it("creates DB entry, then uses DataProcessor's processError() if RequestGenerator returns an error", function() {
    const startStub = this.sandbox.stub(RequestGenerator.prototype, 'start')
    .callsFake(function(errorHandler, successHandler) {
      errorHandler("error", 28);
    });
    const processErrorStub = this.sandbox.stub(DataProcessor.prototype, 'processError');
    const newStub = this.sandbox.stub(DataService.prototype, 'new');
    const dummyDataService = new DataService();

    var website = new Website("www.google.com", 20001, dummyDataService);
    website.startMonitoring();
    expect(processErrorStub).to.have.been.calledWith("error", 28);
    expect(newStub).to.have.been.calledOnce;
    expect(newStub).to.have.been.calledWith("www.google.com");
  })
})
