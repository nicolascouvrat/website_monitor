const chai = require('chai');
const sinon = require('sinon');
const Curl = require('node-libcurl').Curl;
const expect = chai.expect;
const RequestGenerator = require('../lib/request-generator');

describe('The request generator module: ', function() {

  it('throws an error if an empty url is passed', function() {
    expect(function() {
      var requestGenerator = new RequestGenerator("", 1);
    }).to.throw(Error);
  });

  it('throws an error if tick <= timeout', function() {
    expect(function() {
      var requestGenerator = new RequestGenerator("www.google.com", 1, {timeout: 2})
    }).to.throw(Error);
  });

  it('throws a TypeError if options.timeout is not an integer', function() {
    expect(function() {
      var requestGenerator = new RequestGenerator("www.google.com", 1, {timeout: 0.1})
    }).to.throw(TypeError);
  });

  it('throws a TypeError if tick is not an integer', function() {
    expect(function() {
      var requestGenerator = new RequestGenerator("www.google.com", 0.1)
    }).to.throw(TypeError);
  })

  it('calls curl.perform() every tick milliseconds', function() {

    this.clock = sinon.useFakeTimers();

    var requestGenerator = new RequestGenerator("www.google.com", 2, {timeout: 1});
    var count = 0;
    const performStub = this.sandbox.stub(Curl.prototype, 'perform').callsFake(function() {
      count += 1;
    });
    const emptyFunc = function() {};

    requestGenerator.start(emptyFunc, emptyFunc);
    this.clock.tick(10);
    expect(count).to.equal(5);

    this.clock.restore();
  });

  it('stops calling on curl.perform() after stop()', function() {
    this.clock = sinon.useFakeTimers();

    var requestGenerator = new RequestGenerator("www.google.com", 2, {timeout: 1});
    var count = 0;
    const emptyFunc = function() {};
    const performStub = this.sandbox.stub(Curl.prototype, 'perform').callsFake(function() {
      count += 1;
    });

    requestGenerator.start(emptyFunc, emptyFunc);
    this.clock.tick(2);
    requestGenerator.stop();
    this.clock.tick(10);
    expect(count).to.equal(1);

    this.clock.restore();
  });

})
