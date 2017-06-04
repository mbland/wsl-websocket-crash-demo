## Windows Subsystem for Linux WebSocket crash demo

Demonstrates how [PhantomJS][phantom] 2.1.1 crashes when loading pages
containing [WebSockets][ws] while running under [Windows Subsystem for Linux
from the Windows 10 Creators Update][wsl] (version 1703, OS build 15063.332).
This appears germane to [Microsoft/BashOnWindows#903][#903].

[phantom]: http://phantomjs.org/
[ws]:      https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
[wsl]:     https://blogs.msdn.microsoft.com/commandline/2017/04/11/windows-10-creators-update-whats-new-in-bashwsl-windows-console/
[#903]:    https://github.com/Microsoft/BashOnWindows/issues/903

**NOTE:** See [the final section for a report on the culprit](#culprit).

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

You can edit and re-run `collect-logs` or run `./run-demo --strace` directly to
generate the complete strace output.

### Culprit

At this point I'm reasonably certain that the failure is due to the [present
lack of support for nonblocking `connect()` calls on WSL][wsl-nonblock]
(Microsoft/BashOnWindows#1584) throwing off the low-level QT socket libraries.
The presence of `pselect()` calls in the successful, native Ubuntu strace logs
was a hint: [nonblocking `connect()` calls typically return `EINPROGRESS`, after
which clients should use `select()` (or `pselect()`) to wait for the socket to
be writable][EINPROGRESS]:

[wsl-nonblock]: https://github.com/Microsoft/BashOnWindows/issues/1584#issuecomment-271915483
[EINPROGRESS]: https://stackoverflow.com/questions/8277970/what-are-possible-reason-for-socket-error-einprogress-in-solaris

Compare the system calls from `logs/Ubuntu-17.04-debug/strace.log`:

```
socket(AF_INET, SOCK_STREAM|SOCK_CLOEXEC|SOCK_NONBLOCK, IPPROTO_IP) = 8
setsockopt(8, SOL_SOCKET, SO_OOBINLINE, [1], 4) = 0
connect(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, 16) = -1 EINPROGRESS (Operation now in progress)
write(3, "\1\0\0\0\0\0\0\0", 8)         = 8
pselect6(9, [3], [8], [], {0, 0}, {NULL, 8}) = 2 (in [3], out [8], left {0, 0})
read(3, "\1\0\0\0\0\0\0\0", 8)          = 8
connect(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, 16) = 0
getsockname(8, {sa_family=AF_INET, sin_port=htons(53438), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getpeername(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getsockopt(8, SOL_SOCKET, SO_TYPE, [1], [4]) = 0
write(3, "\1\0\0\0\0\0\0\0", 8)         = 8
write(1, "STATUS: success\n", 16STATUS: success
)       = 16
```

to those from `logs/wsl-debug/strace.log`:

```
socket(PF_INET, SOCK_STREAM|SOCK_CLOEXEC|SOCK_NONBLOCK, IPPROTO_IP) = 8
setsockopt(8, SOL_SOCKET, SO_OOBINLINE, [1], 4) = 0
connect(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, 16) = 0
getsockname(8, {sa_family=AF_INET, sin_port=htons(62351), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getpeername(8, {sa_family=AF_INET, sin_port=htons(8080), sin_addr=inet_addr("127.0.0.1")}, [16]) = 0
getsockopt(8, SOL_SOCKET, SO_TYPE, [1], [4]) = 0
write(2, "ASSERTION FAILED: handle == m_ha"..., 37ASSERTION FAILED: handle == m_handle
) = 37
write(2, "Modules/websockets/WebSocketChan"..., 137Modules/websockets/WebSocketChannel.cpp(257) : virtual void WebCore::WebSocketChannel::didOpenSocketStream(WebCore::SocketStreamHandle*)
) = 137

...snip...

--- SIGSEGV {si_signo=SIGSEGV, si_code=SEGV_MAPERR, si_addr=0xbbadbeef} ---
write(2, "PhantomJS has crashed. Please re"..., 127PhantomJS has crashed. Please read the bug reporting guide at
<http://phantomjs.org/bug-reporting.html> and file a bug report.
) = 127
tgkill(25568, 25568, SIGSEGV)           = 0
--- SIGSEGV {si_signo=SIGSEGV, si_code=SI_TKILL, si_pid=25568, si_uid=1000} ---
+++ killed by SIGSEGV (core dumped) +++
.../wsl-websocket-crash-demo/run-demo: line 79: 25566 Segmentation fault      (core dumped) "${PHANTOMJS_CMD[@]}"
```

We'll piece together three related stack traces from `gdb/socket.txt`,
`gdb/connect.txt`, and `gdb/stack-trace.txt` to demonstrate how this series of
system calls were generated and led to the crash. All of them come from a call
to `WebCore::WebSocket::create`, which results in a call to
`QAbstractSocket::connectToHost`:

```
#10 0x000000000a6b2711 in QAbstractSocket::connectToHost (this=0xdce5270, hostName=..., port=8080, openMode=..., protocol=QAbstractSocket::AnyIPProtocol)
    at socket/qabstractsocket.cpp:1652
#11 0x0000000009097aa6 in WebCore::SocketStreamHandlePrivate::SocketStreamHandlePrivate (this=0xdd2dd50, streamHandle=0xdd2dcb0, url=...)
    at platform/network/qt/SocketStreamHandleQt.cpp:70
#12 0x0000000009098cc1 in WebCore::SocketStreamHandle::SocketStreamHandle (this=0xdd2dcb0, url=..., client=0xdd396b0)
    at platform/network/qt/SocketStreamHandleQt.cpp:190
#13 0x000000000907e2c0 in WebCore::SocketStreamHandle::create (url=..., client=0xdd396b0) at platform/network/qt/SocketStreamHandle.h:58
#14 0x000000000907e91c in WebCore::WebSocketChannel::connect (this=0xdd396b0, url=..., protocol=...) at Modules/websockets/WebSocketChannel.cpp:114
#15 0x000000000907b899 in WebCore::WebSocket::connect (this=0xdd20ae0, url=..., protocols=..., ec=@0x7ffffffdb8cc: 0) at Modules/websockets/WebSocket.cpp:289
#16 0x000000000907abf7 in WebCore::WebSocket::create (context=0xdcc3610, url=..., protocols=..., ec=@0x7ffffffdb8cc: 0) at Modules/websockets/WebSocket.cpp:186
#17 0x000000000907aaba in WebCore::WebSocket::create (context=0xdcc3610, url=..., ec=@0x7ffffffdb8cc: 0) at Modules/websockets/WebSocket.cpp:173
```

The paths to QT source files that follow are relative to the root of the
PhantomJS repo at tag `2.1.1` after running `python ./build.py -d`. The critical
point of each stack trace is this block from `QAbstractSocket::connectToHost`
around line 1652:

```c++
        d->_q_startConnecting(info);
````

The stack trace for the WSL `socket()` call (`gdb/socket.txt`) file shows
that at this point, the the underlying socket is created by a call to
`QNativeSocketEnginePrivate::createNewSocket` at
`src/qt/qtbase/src/network/socket/qnativesocketengine_unix.cpp:219`. This line
creates a socket with the nonblocking option hardcoded:

```c++
  int socket = qt_safe_socket(protocol, type, 0, O_NONBLOCK);
```

The stack trace for the WSL `connect()` call (`gdb/connect.txt`) shows a call to 
`QAbstractSocketPrivate::_q_connectToNextAddress` at
`src/qt/qtbase/src/network/socket/qabstractsocket.cpp:1130`, which is the
beginnning of this block:

```c++
        // Tries to connect to the address. If it succeeds immediately
        // (localhost address on BSD or any UDP connect), emit
        // connected() and return.
        if (socketEngine->connectToHost(host, port)) {
            //_q_testConnection();
            fetchConnectionParameters();
            return;
        }
```

This `QNativeSocketEngine::connectToHost` call (note: different from the 
`QAbstractSocket::connectToHost` call higher in the stack) in turn calls
`QNativeSocketEnginePrivate::nativeConnect` at 
`src/qt/qtbase/src/network/socket/qnativesocketengine_unix.cpp:389`, which
points to a call to `qt_safe_connect`:

```c++
    int connectResult = qt_safe_connect(socketDescriptor, sockAddrPtr, sockAddrSize);
#if defined (QNATIVESOCKETENGINE_DEBUG)
    int ecopy = errno;
#endif
    if (connectResult == -1) {
        switch (errno) {
        // ...snip ...
        case EINPROGRESS:
        case EALREADY:
            setError(QAbstractSocket::UnfinishedSocketOperationError,
InvalidSocketErrorString);
            socketState = QAbstractSocket::ConnectingState;
            break;
        // ...snip...
        default:
            break;
        }

        if (socketState != QAbstractSocket::ConnectedState) {
            // ...snip...
            return false;
        }
    }

    // ...snip...

    socketState = QAbstractSocket::ConnectedState;
    return true;
```

If the underlying `connect()` and `qt_safe_connect` had returned `EINPROGRESS`,
the correct `socketState` would've been set,
`NativeSocketEnginePrivate::nativeConnect` would've returned `false`, and
`QAbstractSocketPrivate::_q_connectToNextAddress` would've set up the
`pselect()` notification. Instead, `connect()` returns zero and the function
returns `true`, leading to the
`QAbstractSocketPrivate::fetchConnectionParameters` call at
`src/qt/qtbase/src/network/socket/qabstractsocket.cpp:1132`:

```c++
        // Tries to connect to the address. If it succeeds immediately
        // (localhost address on BSD or any UDP connect), emit
        // connected() and return.
        if (socketEngine->connectToHost(host, port)) {
            //_q_testConnection();
            fetchConnectionParameters();
            return;
        }
```

This in turn produces our final stack trace:

```
#0  0x000000000a1edf70 in WTFCrash () at wtf/Assertions.cpp:345#1  0x000000000907f702 in WebCore::WebSocketChannel::didOpenSocketStream (this=0xdd396b0, handle=0xdd2dcb0) at Modules/websockets/WebSocketChannel.cpp:257
#2  0x0000000009098158 in WebCore::SocketStreamHandlePrivate::socketConnected (this=0xdd2dd50) at platform/network/qt/SocketStreamHandleQt.cpp:107
#3  0x000000000909931d in WebCore::SocketStreamHandlePrivate::qt_static_metacall (_o=0xdd2dd50, _c=QMetaObject::InvokeMetaMethod, _id=0, _a=0x7ffffffdb360)
    at .moc/moc_SocketStreamHandlePrivate.cpp:108
#4  0x000000000a94484e in QMetaObject::activate (sender=0xdce5270, signalOffset=7, local_signal_index=1, argv=0x0) at kernel/qobject.cpp:3713
#5  0x000000000a94403e in QMetaObject::activate (sender=0xdce5270, m=0xd731240 <QAbstractSocket::staticMetaObject>, local_signal_index=1, argv=0x0)
    at kernel/qobject.cpp:3578
#6  0x000000000a6b5b23 in QAbstractSocket::connected (this=0xdce5270) at .moc/moc_qabstractsocket.cpp:367
#7  0x000000000a6b1a10 in QAbstractSocketPrivate::fetchConnectionParameters (this=0xdcb9720) at socket/qabstractsocket.cpp:1321
#8  0x000000000a6b1177 in QAbstractSocketPrivate::_q_connectToNextAddress (this=0xdcb9720) at socket/qabstractsocket.cpp:1132
#9  0x000000000a6b0ef9 in QAbstractSocketPrivate::_q_startConnecting (this=0xdcb9720, hostInfo=...) at socket/qabstractsocket.cpp:1067
#10 0x000000000a6b2711 in QAbstractSocket::connectToHost (this=0xdce5270, hostName=..., port=8080, openMode=..., protocol=QAbstractSocket::AnyIPProtocol)
    at socket/qabstractsocket.cpp:1652
#11 0x0000000009097aa6 in WebCore::SocketStreamHandlePrivate::SocketStreamHandlePrivate (this=0xdd2dd50, streamHandle=0xdd2dcb0, url=...)
    at platform/network/qt/SocketStreamHandleQt.cpp:70
#12 0x0000000009098cc1 in WebCore::SocketStreamHandle::SocketStreamHandle (this=0xdd2dcb0, url=..., client=0xdd396b0)
    at platform/network/qt/SocketStreamHandleQt.cpp:190
#13 0x000000000907e2c0 in WebCore::SocketStreamHandle::create (url=..., client=0xdd396b0) at platform/network/qt/SocketStreamHandle.h:58
#14 0x000000000907e91c in WebCore::WebSocketChannel::connect (this=0xdd396b0, url=..., protocol=...) at Modules/websockets/WebSocketChannel.cpp:114
#15 0x000000000907b899 in WebCore::WebSocket::connect (this=0xdd20ae0, url=..., protocols=..., ec=@0x7ffffffdb8cc: 0) at Modules/websockets/WebSocket.cpp:289
#16 0x000000000907abf7 in WebCore::WebSocket::create (context=0xdcc3610, url=..., protocols=..., ec=@0x7ffffffdb8cc: 0) at Modules/websockets/WebSocket.cpp:186
#17 0x000000000907aaba in WebCore::WebSocket::create (context=0xdcc3610, url=..., ec=@0x7ffffffdb8cc: 0) at Modules/websockets/WebSocket.cpp:173
```

The assertion in `WebCore::WebSocketChannel::didOpenSocketStream` at
`src/qt/qtwebkit/Source/WebCore/Modules/websockets/WebSocketChannel.cpp:257` is:

```c++
void WebSocketChannel::didOpenSocketStream(SocketStreamHandle* handle)
{
    LOG(Network, "WebSocketChannel %p didOpenSocketStream()", this);
    ASSERT(handle == m_handle);
```

which under further inspection in GDB reveals:

```
(gdb) up
#1  0x000000000907f702 in WebCore::WebSocketChannel::didOpenSocketStream (this=0xdce4b90, handle=0xdcc0a50) at Modules/websockets/WebSocketChannel.cpp:257
257     Modules/websockets/WebSocketChannel.cpp: No such file or directory.
(gdb) print handle
$1 = (WebCore::SocketStreamHandle *) 0xdcc0a50
(gdb) print m_handle
$2 = {m_ptr = 0x0}
```
