# website_monitor
**Console app for Node.js, allowing for the monitoring of websites.**

Then user can specify `URL` and `timing`, ordering the app to check the `URL` every `timing` milliseconds via cURL.
The app automatically tracks the availability of every single website registered over the past two minutes, publishing an alert message if the availability goes below a user-specified treshold.
Besides, more detailed statistics (avg/min/max query time for successful requests) are also calculated, and printed at intervals specified by the user (the user can decide both the frequency of a scan, as well as its amplitude, and can register multiple scans).

For v1.0, storage is done in cache, and the amplitude can therefore not exceed an hour.
