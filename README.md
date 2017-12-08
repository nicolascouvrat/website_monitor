# website_monitor
**Console app for Node.js, allowing for the monitoring of websites.**

This simple application runs in the node console, and allows a user to track URLs  in order to check their uptime, along with other statistics (such as average, minimal or maximal response times).

## Overview

This application checks websites at defined intervals via cURL, saving several metrics along the way. The user is free to use `app.watch(url, checkInterval)` at any time to register a new website to watch.

In this application, we define the availability of a website by: _availability = #successful_requests / (#successful_requests + #failed_requests)_ where a _failed_request_ is either a cURL error (e.g. 'Could not resolve host') or an invalid HTTP code that the user is free to define (see **request generation** for more details). If _availability_ goes passes a certain threshold (either going up or down), the application alerts the user and logs that alert to a text file if possible for safekeeping (see **availability monitoring**).

Besides, the application also stores request-related metrics and computes basic statistics that are then printed at regular intervals. The frequency and amplitude (e.g. every two minutes, print data for the last 10 minutes) of these scans can be defined by the user at will (see **statistics panel**).

## Basic usage

the app uses the [queue-fifo](https://www.npmjs.com/package/queue-fifo) module based on a **custom version** of [dbly-linked-list](https://www.npmjs.com/package/dbly-linked-list) (now available in the above repository as of **v0.2.0**)

The app can be launched from the Node.js console simply by calling

```javascript
var app = require('./app');
```
Several functions can then be called using `app.function_name()`. The most notable include:

* **watch a new website**
```javascript
//assuming app is already defined
app.watch("www.test.com", 30000) //the check interval is in milliseconds
```

* **start statistics panel**
```javascript
// this will initiate the printing of information to the console
app.startStatistics()
```
* **get the list of watched websites**
```javascript
app.getWatchedList()
```

## Details

### Request generation

One request generator is created per call to `app.watch()`. This generator is based on the [node-libcurl](https://www.npmjs.com/package/node-libcurl) module, and uses `setInterval` to perform queries indefinitely. This does come with one main limitation: trying to query while the previous query is not completed will throw a cURL `Handle already in use!` error. Such an error is avoided via a `timeout` parameter, with a default at 20s. Therefore, the `checkInterval` cannot be initialized with a value smaller than `timeout`.
Since we are monitoring websites for users, the use of that `timeout` is justified by the fact that a _very_ slow website might as well be considered as unavailable for all intents and purposes.
`timeout` is adjustable through options, and can be set to none via `timeout = 0`. In that case however, `handle already in use!` errors might happen.

### Availability monitoring

As explained in the overview, one of the main purposes of this application is to calculate the availability of websites. What is considered as an 'available website' is defined in the Availability Monitor (one per watched website).
Is _available_ a website that:
* answers without triggering a cURL error (e.g. 'Can't resolve host) nor a timeout
* does not return an HTTP code that has been identified as undesirable by the user (default: 4xx and 5xx)

_availability_ is then computed over the last two minutes **everytime the request generator performs a request**, taking a value in [0,1]. If _availability_ crosses a user-defined `availabilityTreshold` (default: 0.8), an alert message (if going down) or info message (if going up) is triggered. That message will appear in the console, and be saved in a text file (default: './.availability_log/url_without_slashes.log.txt').

**note:** it is worth noting that the availability monitor is directly linked to the request generator, and does not make any database calls. Information is stored directly in a queue, giving O(1) complexity calls. It does take space **that increases when the check interval decreases, but does not depend on the duration of monitoring**, but that choice was made due to the frequency of database calls in order to limit them.

### Statistics panel

The application itself has only one statistics panel, that is automatically created with default settings at application launch. That panel queries the database for each tracked url, retrieving information that is then computed into statistics and printed on the console.

Scans are defined by:
* `delay`, or the frequency at which there are performed (one every `delay` seconds)
* `amplitude`, in seconds, which limits the amount of information retrieved (all information for the past `amplitude seconds`)
Multiple scans can be defined at the same time, and are saved in `.scanList`.

**note for v1.0:** due to the way storage works (in cache), `amplitude` is limited to 3600s (1h).

### Data storage

**The following information is valid only for v1.0 and might change later**

For now, data is stored in cache memory via a Mock Database that mimicks a real one. Interaction through that database is made with a standardized `DataService` module, so that transitioning to a real database will not require changing any code besides the mock database.

To save space, the `MockDatabase` module implements a queue storage, to limit the maximum length of elements stored (not more than 1hr, thus the `amplitude` limitation for statistics). Data is returned to the `DataService` as an array, which is a raw loss of time in itself (the conversion linked list to array could be done later), but is justified by the fact that our final implementation with a real (e.g. MongoDB) database would return arrays of objects.

## API

* ### .watch(url, tick[, delayedTracking, options])
    starts watching a website of given `url` every `tick` milliseconds.
    `delayedTracking` (default: false) will prevent the automatic tracking of that website by the statistics panel, thus requiring a `.track(url)` call later on.
    `options` can be specified, even partially (the remaining will default to **default options**, not application-wide options), and will override other options for that specific website

* ### .startStatistics()
    orders the StatisticsPanel to start printing out messages

* ### .stopStatistics()
    orders the StatisticsPanel to stop printing messages

* ### .resumeStatistics()
    see `.startStatistics()`

* ### .resetStatistics(keepTrack)
    stops the current StatisticsPanel to set up a new one with the current application-wide options. Note that the panel must then be restarted using `.startStatistics()`
    if `keepTrack` is set to true, then the list of tracked websites is ported to the new Statistics Panel (default: false)

* ### .track(url)
    registers `url` for the statistics panel's scans. Does nothing if `url` is not currently watched, making this command effectively useful only if a website has been watched with `delayTracking` set to `true` or after a reset with `keepTrack` set to `false`

* ### .addScan(delay, amplitude)
    requests a new statistics scan, using data over the last `amplitude` seconds every `delay` seconds, starting from the call to this command (meaning not necessarily synchronized with other scans)

* ### .getWatchedList()
    prints all currently watched URLs

* ### .getDefaultOptions()
    prints all **default** options (the one the app will default to if not specified otherwise)

* ### .getOptions()
    prints all **application-wide** options, that will override relevant default options

* ### .setWatchOption(option, value) _and_ .setStatsOption(option, value)
    sets **application-wide** options, be it for watching or statistics, of `option` to `value`. Nested options can be accessed using the '.' separator (e.g. `.setWatchOption("requestOptions.timeout", 5000)`).
    **note:** a change it stats options will only be effective after a `.restartStatistics()`

* ### .help()
    prints useful information

## Options

Here is a list of all available options and their defaults, that can be set either through `.setXXOption(option, value)` or manually on `.watch()` call.

**Note:** application-wide options will take precedence on default options, and manually set options will override every other option. **In all cases**, not specified options will revert to the default ones.

### Website watching options

```javascript
{
  requestOptions: {
    timeout: 20000, //timeout in milliseconds
    followLocation: true, //orders the curl client to follow on 3xx HTTP codes
    nobody: true //only download headers to save time
  },
  dataProcessorOptions: {
    errorList: ['4xx', '5xx'] //list of HTTP codes that will be considered as undesirable
                              //the 'x' (case insensitive) character is a joker
                              //(for instance, '4x5' would match 405, 415, etc.)
  },
  availabilityMonitorOptions: {
    timeSpan: 120, //the time over which availability is calculated, in seconds
    availabilityTreshold: 0.8, //availability threshold
    saveToFile: true, //if set to false, information will not be saved to a .txt file
    fileName: "url without slashes", //will trim the url to make it an LINUX acceptable file file name
                                    //e.g. http://stuff.com/more/stuff => stuff.com_more_stuff.log.txt
    filePath: './.availability_log/' //folder in which logs are saved for this website
  }  
}
```

### Statistics panel options
```javascript
{
  scanList: [ //all the scans to be performed by the panel, for all tracked websites
    {delay: 10, amplitude: 600} //both in seconds. one scan every delay seconds, over amplitude time
    {delay: 60, amplitude: 3600}
  ]
}
```

## Future improvements

The most urgent improvement would be to add a proper data storage, for instance through a database. As is, the application is most likely not fit to track large amount of data on multiple websites simultaneously, and does not save data for more than one hour.
Other improvements that could be made
* More test -- unit tests are already made, but no integration tests has been written yet
* More statistics/more data -- for now as of v1.0 (due to time limitations) only a very minimal number of metrics are tracked. This would need improvement
* Quality of life -- a better console display (using some colors?), that can be run directly in the shell could be made out of the current Node.js console only application.


_revision 1.0, 2017/11/15_
