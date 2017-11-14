const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const DataService = require('../lib/data.service');
const MockDatabase = require('../lib/mock-database');

describe("The DataService module: ", function() {
  it("Creates entry in the database, and handles errors", function() {
    const handleErrorStub = this.sandbox.stub(DataService.prototype, 'handleError');
    const newStub = this.sandbox.stub(MockDatabase.prototype, 'new');
    var error = new Error("error!");
    newStub.onCall(1).throws(error);
    var dummyUrl = "www.google.com";
    var dataService = new DataService();

    dataService.new(dummyUrl);
    dataService.new(dummyUrl);

    expect(newStub).to.have.callCount(2);
    expect(newStub).to.have.been.calledWith("www.google.com");
    expect(handleErrorStub).to.have.been.calledOnce;
    expect(handleErrorStub).to.have.been.calledWith(error, "new");
  });

  it("Saves data in the database, and handles errors", function() {
    const handleErrorStub = this.sandbox.stub(DataService.prototype, 'handleError');
    const saveStub = this.sandbox.stub(MockDatabase.prototype, 'save');
    var error = new Error("error!");
    saveStub.onCall(1).throws(error);
    var dummyData = {key: 'item'}
    var dataService = new DataService();

    dataService.save(dummyData);
    dataService.save(dummyData);

    expect(saveStub).to.have.callCount(2);
    expect(handleErrorStub).to.have.callCount(1);
    expect(handleErrorStub).to.have.been.calledWith(error, "save");
  });

  it("gets data from the database, and handles error", function() {
    const handleErrorStub = this.sandbox.stub(DataService.prototype, 'handleError');
    const getOverStub = this.sandbox.stub(MockDatabase.prototype, 'getOver');
    var error = new Error("error!");
    getOverStub.withArgs(3700).throws(error);
    var dataService = new DataService();

    dataService.getOver(600);
    dataService.getOver(3700);

    expect(getOverStub).to.have.callCount(2);
    expect(handleErrorStub).to.have.been.calledOnce;
    expect(handleErrorStub).to.have.been.calledWith(error, "getOver");
  });

  it("Checks if an entry exists in database, and handles error", function() {
    const handleErrorStub = this.sandbox.stub(DataService.prototype, 'handleError');
    const hasEntryStub = this.sandbox.stub(MockDatabase.prototype, 'hasEntry');
    var error = new Error('error');
    hasEntryStub.withArgs("www.crash.com").throws(error);
    hasEntryStub.withArgs("www.google.com").returns(true);
    var dataService = new DataService();

    var firstTest = dataService.hasEntry("www.google.com");
    var secondTest = dataService.hasEntry("www.crash.com");

    expect(hasEntryStub).to.have.callCount(2);
    expect(handleErrorStub).to.have.been.calledOnce;
    expect(handleErrorStub).to.have.been.calledWith(error, "hasEntry");
    expect(firstTest).to.be.equal(true);

  })

})
