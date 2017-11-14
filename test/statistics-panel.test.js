const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
chai.use(require('sinon-chai'));
const StatisticsPanel = require('../lib/statistics-panel');
const DataService = require('../lib/data.service');

describe("The StatisticsPanel module: ", function() {
  it("takes a DataService an optional scan list (setting up scan parameters)", function() {
    const dummyDataService = new DataService();
    const defaultScanList = [
      {delay: 10, amplitude: 600},
      {delay: 60, amplitude: 3600}
    ];
    const testScanList = [
      {delay: 1, amplitude: 1}
    ];
    var statisticsPanel = new StatisticsPanel(dummyDataService);
    expect(statisticsPanel.dataService).to.deep.equal(dummyDataService);
    expect(statisticsPanel.scanList).to.deep.equal(defaultScanList);

    statisticsPanel = new StatisticsPanel(dummyDataService, {scanList: testScanList});
    expect(statisticsPanel.dataService).to.deep.equal(dummyDataService);
    expect(statisticsPanel.scanList).to.deep.equal(testScanList);
  });

  it("can track a new url by adding it to its tracking list, and will do so only if the database contains such an entry", function() {
    const hasEntryStub = this.sandbox.stub(DataService.prototype, 'hasEntry')
    hasEntryStub.onCall(0).returns(false);
    hasEntryStub.onCall(1).returns(true);
    const dummyDataService = new DataService();
    var statisticsPanel = new StatisticsPanel(dummyDataService);
    const url = "www.google.com";

    statisticsPanel.track(url);
    expect(statisticsPanel.trackedWebsites).to.deep.equal([]);

    statisticsPanel.track(url);
    expect(statisticsPanel.trackedWebsites).to.deep.equal([url]);
  });

  it("sets up an interval that will call on a full scan every delay seconds", function() {
    const now = new Date();
    const dummyDataService = new DataService();
    const scanAllStub = this.sandbox.stub(StatisticsPanel.prototype, 'scanAll')
    this.clock = sinon.useFakeTimers(now);
    var statisticsPanel = new StatisticsPanel(dummyDataService);

    statisticsPanel.setAllIntervals(1, 10);
    this.clock.tick(5000);

    expect(statisticsPanel.intervalList.length).to.be.equal(1);
    expect(scanAllStub).to.have.callCount(5);
    expect(scanAllStub).to.have.been.calledWith(10);

    this.clock.restore();
  });

  it("scans all websites in tracking list, asking for data over amplitude seconds, processing it then printing it", function() {
    const consoleInfoStub = this.sandbox.stub(console, 'info');
    const getOverStub = this.sandbox.stub(DataService.prototype, 'getOver').returns([{}]);
    const processDataStub = this.sandbox.stub(StatisticsPanel.prototype, 'processData').returns({});
    const prettyStatisticsStub = this.sandbox.stub(StatisticsPanel.prototype, 'prettyStatistics').returns("pretty");
    const dummyDataService = new DataService();
    var statisticsPanel = new StatisticsPanel(dummyDataService);

    // try with empty tracking list
    statisticsPanel.scanAll(100);

    expect(getOverStub).to.have.callCount(0);
    expect(processDataStub).to.have.callCount(0);
    expect(prettyStatisticsStub).to.have.callCount(0);
    expect(consoleInfoStub).to.have.callCount(2)

    statisticsPanel.trackedWebsites = ["www.google.com", "www.test.com"];
    statisticsPanel.scanAll(100);

    expect(getOverStub).to.have.callCount(2);
    expect(getOverStub).to.have.been.calledWith("www.test.com", 100);
    expect(processDataStub).to.have.callCount(2);
    expect(processDataStub).to.have.been.calledWith([{}]);
    expect(prettyStatisticsStub).to.have.callCount(2);
    expect(prettyStatisticsStub).to.have.been.calledWith("www.test.com", 100, {});
    expect(consoleInfoStub).to.have.callCount(6);
    expect(consoleInfoStub).to.have.been.calledWith("   pretty"); // three spaces before
  });

  it("processes the data from the database into actual stats", function() {
    const dummyDataList = [
      {
        timestamp: new Date(),
        value: 1,
        code: 200,
        details: {
          totalTime: 60
        }
      },
      {
        timestamp: new Date(),
        value: 1,
        code: 200,
        details: {
          totalTime: 100
        }
      },
      {
        timestamp: new Date(),
        value: 0,
        code: 404,
        details: {
          errorMessage: "not found"
        }
      },
      {
        timestamp: new Date(),
        value: 1,
        code: 200,
        details: {
          totalTime: 40
        }
      }
    ];
    const emptyDataList = [];
    const noSuccessDataList = [
      {
        timestamp: new Date(),
        value: 0,
        code: 404,
        details: {
          errorMessage: "not found"
        }
      }
    ];
    const dummyDataService = new DataService();
    var statisticsPanel = new StatisticsPanel(dummyDataService);

    // expected results
    var emptyResult = {
      availability: undefined,
      averageSuccessTime: undefined,
      maxSuccessTime: undefined,
      minSuccessTime: undefined
    };
    var dummyResult = {
      availability: 3/4,
      averageSuccessTime: 200/3,
      maxSuccessTime: 100,
      minSuccessTime: 40
    };
    var noSuccessResult = {
      availability: 0,
      averageSuccessTime: undefined,
      minSuccessTime: undefined,
      maxSuccessTime: undefined
    }

    var emptyTest = statisticsPanel.processData(emptyDataList);
    var dummyTest = statisticsPanel.processData(dummyDataList);
    var noSuccessTest = statisticsPanel.processData(noSuccessDataList);

    expect(emptyTest).to.deep.equal(emptyResult);
    expect(dummyTest).to.deep.equal(dummyResult);
    expect(noSuccessTest).to.deep.equal(noSuccessResult);
  });

  it("creates a (pretty!) info line", function() {
    const dummyDataService = new DataService();
    const test = {
      availability: 0.4562,
      averageSuccessTime: 50.56,
      minSuccessTime: 31.11,
      maxSuccessTime: 70
    };
    const emptyTest = {
      availability: undefined,
      averageSuccessTime: undefined,
      minSuccessTime: undefined,
      maxSuccessTime: undefined
    }
    var statisticsPanel = new StatisticsPanel(dummyDataService);
    const url = "www.google.com";
    const amplitude = 3600;
    const expectedString = "Statistics for the website "
      + url
      + " over the last "
      + amplitude
      + " seconds: "
      + "availability=" + "0.46" + " | "
      + "average success time=" + "50.6" + " (ms) | "
      + "max success time=" + "70.0" + " (ms) | "
      + "min success time=" + "31.1" + " (ms)";
    const expectedEmptyResult = "Statistics for the website "
      + url
      + " over the last "
      + amplitude
      + " seconds: "
      + "availability=" + "NO_DATA" + " | "
      + "average success time=" + "NO_DATA" + " | "
      + "max success time=" + "NO_DATA" + " | "
      + "min success time=" + "NO_DATA";

    var firstTest = statisticsPanel.prettyStatistics(url, amplitude, test);
    expect(firstTest).to.be.equal(expectedString);

    var secondTest = statisticsPanel.prettyStatistics(url, amplitude, emptyTest);
    expect(secondTest).to.be.equal(expectedEmptyResult);
  });

  it("sets up a scan interval for each element in the scan list", function() {
    const dummyDataService = new DataService();
    const setAllIntervalsStub = this.sandbox.stub(StatisticsPanel.prototype, 'setAllIntervals');
    var statisticsPanel = new StatisticsPanel(dummyDataService);

    const emptyScanList = [];
    const dummyScanList = [
      {delay: 50, amplitude: 600},
      {delay: 80, amplitude: 400}
    ];

    statisticsPanel.scanList = emptyScanList;
    statisticsPanel.start();
    expect(setAllIntervalsStub).to.have.callCount(0);

    statisticsPanel.scanList = dummyScanList;
    statisticsPanel.start();
    expect(setAllIntervalsStub).to.have.callCount(2);
    expect(setAllIntervalsStub).to.have.been.calledWith(80, 400);
  })

})
