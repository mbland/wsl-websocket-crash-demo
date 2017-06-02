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
<!DOCTYPE html><html><head>
  </head>
  <body>
  <!-- Code injected by live-server -->
<script type="text/javascript">
        // <![CDATA[  <-- For SVG support
        if ('WebSocket' in window) {

        // ...snip...
</script>
```

The second example is from the Windows Subsystem for Linux as described in
the opening paragraph, also running under VMware Fusion 8.5.7 using Node.js
v7.10.0 installed via nvm:

```
$ ./run-demo

Serving "." at http://127.0.0.1:8080
Ready for changes
Running PhantomJS as: node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs .../wsl-websocket-crash-demo/visit-site.js
PhantomJS has crashed. Please read the bug reporting guide at
<http://phantomjs.org/bug-reporting.html> and file a bug report.
./run-demo: line 112: 20226 Segmentation fault      (core dumped) "${PHANTOMJS_CMD[@]}"
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
Running PhantomJS as: node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs .../wsl-websocket-crash-demo/visit-site.js
[Fri Jun 02 2017 12:30:49 GMT-0400 (DST)] "GET /" "Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1"
STATUS: success
<!DOCTYPE html><html><head>
  </head>
  <body>


</body></html>
http-server stopped.
```

### Debug and `strace` output

The `./run-demo` script also takes one of two optional flags, `--debug` or
`--strace`, to run `phantomjs --debug` and `strace phantomjs`, respectively.

The `logs/` directory contains `./run-demo --debug` and `./run-demo --strace`
output, both with and without WebSockets (`--no-ws`), on both native Ubuntu
Linux and Windows Subsystem for Linux. The files were generated all at once by
running `./collect-logs`.

The `logs/wsl/debug.log` and `logs/wsl/strace.log` files contain crash-related
output. All other log files contain output from successful runs. I've heavily
filtered and edited the `logs/*/strace*.log` files to remove all lines just
before the point at which the `index.html` file is successfully loaded (for
`--no-ws`) or at which the crash occurs. The full strace output can be generated
via `run-demo --strace`.

The relevant output from `logs/wsl/strace.log` appears to be:

```
socket(PF_INET, SOCK_STREAM|SOCK_CLOEXEC|SOCK_NONBLOCK, IPPROTO_IP) = 8
setsockopt(8, SOL_SOCKET, SO_OOBINLINE, [1], 4) = 0
connect(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, 16) = 0
getsockname(8, {sa_family=AF_INET, sin_port=htons(58904), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getpeername(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getsockopt(8, SOL_SOCKET, SO_TYPE, [1], [4]) = 0
--- SIGSEGV {si_signo=SIGSEGV, si_code=SEGV_MAPERR, si_addr=0x500000022} ---
write(2, "PhantomJS has crashed. Please re"..., 127PhantomJS has crashed. Please read the bug reporting guide at
<http://phantomjs.org/bug-reporting.html> and file a bug report.
) = 127
tgkill(22020, 22020, SIGSEGV)           = 0
--- SIGSEGV {si_signo=SIGSEGV, si_code=SI_TKILL, si_pid=22020, si_uid=1000} ---
+++ killed by SIGSEGV (core dumped) +++
.../wsl-websocket-crash-demo/run-demo: line 78: 22018 Segmentation fault      (core dumped) "${PHANTOMJS_CMD[@]}"
```

whereas `logs/Ubuntu-17.04/strace.log` shows the following; note the use of
[`AF_INET` instead of `PF_INET`][af_inet] in the call to `socket`, in case
that's relevant:

[af_inet]: https://stackoverflow.com/questions/6729366/what-is-the-difference-between-af-inet-and-pf-inet-in-socket-programming

```
socket(AF_INET, SOCK_STREAM|SOCK_CLOEXEC|SOCK_NONBLOCK, IPPROTO_IP) = 8
setsockopt(8, SOL_SOCKET, SO_OOBINLINE, [1], 4) = 0
connect(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, 16) = -1 EINPROGRESS (Operation now in progress)
pselect6(9, [3], [8], [], {0, 0}, {NULL, 8}) = 1 (out [8], left {0, 0})
connect(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, 16) = 0
getsockname(8, {sa_family=AF_INET, sin_port=htons(50936), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getpeername(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getsockopt(8, SOL_SOCKET, SO_TYPE, [1], [4]) = 0
write(3, "\1\0\0\0\0\0\0\0", 8)         = 8
pselect6(9, [3 8], [8], [], {0, 41000000}, {NULL, 8}) = 2 (in [3], out [8], left {0, 40998585})
read(3, "\1\0\0\0\0\0\0\0", 8)          = 8
write(8, "GET //ws HTTP/1.1\r\nUpgrade: webs"..., 396) = 396
pselect6(9, [3 8], [], [], {0, 41000000}, {NULL, 8}) = 1 (in [3], left {0, 40803066})
read(3, "\1\0\0\0\0\0\0\0", 8)          = 8
write(3, "\1\0\0\0\0\0\0\0", 8)         = 8
pselect6(9, [3 8], [], [], {0, 0}, {NULL, 8}) = 1 (in [3], left {0, 0})
read(3, "\1\0\0\0\0\0\0\0", 8)          = 8
write(3, "\1\0\0\0\0\0\0\0", 8)         = 8
write(1, "STATUS: success\n", 16STATUS: success
)       = 16
write(1, "<!DOCTYPE html><html><head>\n  </"..., 1247<!DOCTYPE html><html><head>
  </head>
  <body>
  <!-- Code injected by live-server -->
<script type="text/javascript">
	// <![CDATA[  <-- For SVG support
	if ('WebSocket' in window) {
  // ...snip...
</script>


</body></html>
) = 1247

```

You can edit and re-run `collect-logs` or run `./run-demo --strace` directly to
generate the complete strace output.
