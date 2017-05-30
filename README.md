## Windows Subsystem for Linux WebSocket crash demo

Demonstrates how [PhantomJS][phantom] 2.1.1 crashes when loading pages
containing [WebSockets][ws] while running under [Windows Subsystem for Linux
from the Windows 10 Creators Update][wsl] (version 1703, OS build 15063.332).
This appears germane to [Microsoft/BashOnWindows#903][#903].

[phantom]: http://phantomjs.org/
[ws]:      https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
[wsl]:     https://blogs.msdn.microsoft.com/commandline/2017/04/11/windows-10-creators-update-whats-new-in-bashwsl-windows-console/
[#903]:    https://github.com/Microsoft/BashOnWindows/issues/903

The `./run-demo` script installs PhantomJS 2.1.1 via the [phantomjs-prebuilt][]
npm package, and uses the [live-server][] package to serve `index.html` and
reproduce the crash, since it injects JavaScript code for signalling a reload
via a WebSocket; this appears to be a similar mechanism to that used by
[Karma][].

[phantomjs-prebuilt]: https://www.npmjs.com/package/phantomjs-prebuilt
[live-server]:        https://www.npmjs.com/package/live-server
[Karma]:              https://karma-runner.github.io/

The first example demonstrates a successful run on an installation of Ubuntu
17.04 running under VMware Fusion 8.5.7, as well as a native installation of
macOS 10.12.5, both running [Node.js][] v7.10.0 installed via [nvm][]:

[Node.js]: https://nodejs.org/
[nvm]:     https://github.com/creationix/nvm

```
$ ./run-demo

Serving "." at http://127.0.0.1:8080
Ready for changes
STATUS: success
```

The second example is from the Windows Subsystem for Linux as described in
the opening paragraph, also running under VMware Fusion 8.5.7 using Node.js
v7.10.0 installed via nvm:

```
$ ./run-demo

Serving "." at http://127.0.0.1:8080
Ready for changes
PhantomJS has crashed. Please read the bug reporting guide at
<http://phantomjs.org/bug-reporting.html> and file a bug report.
```

To demonstrate the difference to loading the page without WebSocket code,
`./run-demo --no-ws` uses the [http-server][] package to successfully serve the
`index.html` file without a crash. The output is roughly the same across all
platforms:

[http-server]: https://www.npmjs.com/package/http-server

```
$ ./run-demo --no-ws

Starting up http-server, serving .
Available on:
  http://127.0.0.1:8080
Hit CTRL-C to stop the server
[Tue May 30 2017 17:45:53 GMT-0400 (EDT)] "GET /" "Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1"
STATUS: success
http-server stopped.
```
