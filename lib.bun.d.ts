declare namespace Bun {
    const version: string;
    const isMainThread: boolean;

    /**
     * Pretty-print an object the same as {@link console.log} to a `string`
     *
     * Supports JSX
     *
     * @param args
     */
    function inspect(arg: any, options?: BunInspectOptions): string;
    namespace inspect {
        /**
         * That can be used to declare custom inspect functions.
         */
        const custom: typeof import("util").inspect.custom;

        /**
         * Pretty-print an object or array as a table
         *
         * Like {@link console.table}, except it returns a string
         */
        function table(
            tabularData: object | unknown[],
            properties?: string[],
            options?: { colors?: boolean; },
        ): string;
        function table(
            tabularData: object | unknown[],
            options?: { colors?: boolean; },
        ): string;
    }

    interface GenericServeOptions {
        /**
         * What URI should be used to make {@link Request.url} absolute?
         *
         * By default, looks at {@link hostname}, {@link port}, and whether or not SSL is enabled to generate one
         *
         * @example
         * ```js
         * "http://my-app.com"
         * ```
         *
         * @example
         * ```js
         * "https://wongmjane.com/"
         * ```
         *
         * This should be the public, absolute URL – include the protocol and {@link hostname}. If the port isn't 80 or 443, then include the {@link port} too.
         *
         * @example
         * "http://localhost:3000"
         */
        // baseURI?: string;

        /**
         * What is the maximum size of a request body? (in bytes)
         * @default 1024 * 1024 * 128 // 128MB
         */
        maxRequestBodySize?: number;

        /**
         * Render contextual errors? This enables bun's error page
         * @default process.env.NODE_ENV !== 'production'
         */
        development?: boolean;

        error?: (
            this: Server,
            error: ErrorLike,
        ) => Response | Promise<Response> | undefined | Promise<undefined>;

        /**
         * Uniquely identify a server instance with an ID
         *
         * ### When bun is started with the `--hot` flag
         *
         * This string will be used to hot reload the server without interrupting
         * pending requests or websockets. If not provided, a value will be
         * generated. To disable hot reloading, set this value to `null`.
         *
         * ### When bun is not started with the `--hot` flag
         *
         * This string will currently do nothing. But in the future it could be useful for logs or metrics.
         */
        id?: string | null;

        /**
         * Server static Response objects by route.
         *
         * @example
         * ```ts
         * Bun.serve({
         *   static: {
         *     "/": new Response("Hello World"),
         *     "/about": new Response("About"),
         *   },
         *   fetch(req) {
         *     return new Response("Fallback response");
         *   },
         * });
         * ```
         *
         * @experimental
         */
        static?: Record<`/${string}`, Response>;
    }

    interface ServeOptions extends GenericServeOptions {
        /**
         * What port should the server listen on?
         * @default process.env.PORT || "3000"
         */
        port?: string | number;

        /**
         * If the `SO_REUSEPORT` flag should be set.
         *
         * This allows multiple processes to bind to the same port, which is useful for load balancing.
         *
         * @default false
         */
        reusePort?: boolean;

        /**
         * What hostname should the server listen on?
         *
         * @default
         * ```js
         * "0.0.0.0" // listen on all interfaces
         * ```
         * @example
         *  ```js
         * "127.0.0.1" // Only listen locally
         * ```
         * @example
         * ```js
         * "remix.run" // Only listen on remix.run
         * ````
         *
         * note: hostname should not include a {@link port}
         */
        hostname?: string;

        /**
         * If set, the HTTP server will listen on a unix socket instead of a port.
         * (Cannot be used with hostname+port)
         */
        unix?: never;

        /**
         * Sets the the number of seconds to wait before timing out a connection
         * due to inactivity.
         *
         * Default is `10` seconds.
         */
        idleTimeout?: number;

        /**
         * Handle HTTP requests
         *
         * Respond to {@link Request} objects with a {@link Response} object.
         */
        fetch(
            this: Server,
            request: Request,
            server: Server,
        ): Response | Promise<Response>;
    }

    interface TLSOptions {
        /**
         * Passphrase for the TLS key
         */
        passphrase?: string;

        /**
         * File path to a .pem file custom Diffie Helman parameters
         */
        dhParamsFile?: string;

        /**
         * Explicitly set a server name
         */
        serverName?: string;

        /**
         * This sets `OPENSSL_RELEASE_BUFFERS` to 1.
         * It reduces overall performance but saves some memory.
         * @default false
         */
        lowMemoryMode?: boolean;

        /**
         * If set to `false`, any certificate is accepted.
         * Default is `$NODE_TLS_REJECT_UNAUTHORIZED` environment variable, or `true` if it is not set.
         */
        rejectUnauthorized?: boolean;

        /**
         * If set to `true`, the server will request a client certificate.
         *
         * Default is `false`.
         */
        requestCert?: boolean;

        /**
         * Optionally override the trusted CA certificates. Default is to trust
         * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
         * replaced when CAs are explicitly specified using this option.
         */
        ca?:
        | string
        | Buffer
        | BunFile
        | Array<string | Buffer | BunFile>
        | undefined;
        /**
         *  Cert chains in PEM format. One cert chain should be provided per
         *  private key. Each cert chain should consist of the PEM formatted
         *  certificate for a provided private key, followed by the PEM
         *  formatted intermediate certificates (if any), in order, and not
         *  including the root CA (the root CA must be pre-known to the peer,
         *  see ca). When providing multiple cert chains, they do not have to
         *  be in the same order as their private keys in key. If the
         *  intermediate certificates are not provided, the peer will not be
         *  able to validate the certificate, and the handshake will fail.
         */
        cert?:
        | string
        | Buffer
        | BunFile
        | Array<string | Buffer | BunFile>
        | undefined;
        /**
         * Private keys in PEM format. PEM allows the option of private keys
         * being encrypted. Encrypted keys will be decrypted with
         * options.passphrase. Multiple keys using different algorithms can be
         * provided either as an array of unencrypted key strings or buffers,
         * or an array of objects in the form {pem: <string|buffer>[,
         * passphrase: <string>]}. The object form can only occur in an array.
         * object.passphrase is optional. Encrypted keys will be decrypted with
         * object.passphrase if provided, or options.passphrase if it is not.
         */
        key?:
        | string
        | Buffer
        | BunFile
        | Array<string | Buffer | BunFile>
        | undefined;
        /**
         * Optionally affect the OpenSSL protocol behavior, which is not
         * usually necessary. This should be used carefully if at all! Value is
         * a numeric bitmask of the SSL_OP_* options from OpenSSL Options
         */
        secureOptions?: number | undefined; // Value is a numeric bitmask of the `SSL_OP_*` options
    }

    interface TLSServeOptions extends ServeOptions, TLSOptions {
        tls?: TLSOptions | TLSOptions[];
    }

    interface WebSocketServeOptions<WebSocketDataType = undefined>
        extends GenericServeOptions {
        /**
         * What port should the server listen on?
         * @default process.env.PORT || "3000"
         */
        port?: string | number;

        /**
         * What hostname should the server listen on?
         *
         * @default
         * ```js
         * "0.0.0.0" // listen on all interfaces
         * ```
         * @example
         *  ```js
         * "127.0.0.1" // Only listen locally
         * ```
         * @example
         * ```js
         * "remix.run" // Only listen on remix.run
         * ````
         *
         * note: hostname should not include a {@link port}
         */
        hostname?: string;

        /**
         * Enable websockets with {@link Bun.serve}
         *
         * For simpler type safety, see {@link Bun.websocket}
         *
         * @example
         * ```js
         * import { serve } from "bun";
         * serve({
         *  websocket: {
         *    open: (ws) => {
         *      console.log("Client connected");
         *    },
         *    message: (ws, message) => {
         *      console.log("Client sent message", message);
         *    },
         *    close: (ws) => {
         *      console.log("Client disconnected");
         *    },
         *  },
         *  fetch(req, server) {
         *    const url = new URL(req.url);
         *    if (url.pathname === "/chat") {
         *      const upgraded = server.upgrade(req);
         *      if (!upgraded) {
         *        return new Response("Upgrade failed", { status: 400 });
         *      }
         *    }
         *    return new Response("Hello World");
         *  },
         * });
         * ```
         * Upgrade a {@link Request} to a {@link ServerWebSocket} via {@link Server.upgrade}
         *
         * Pass `data` in @{link Server.upgrade} to attach data to the {@link ServerWebSocket.data} property
         */
        websocket: WebSocketHandler<WebSocketDataType>;

        /**
         * Handle HTTP requests or upgrade them to a {@link ServerWebSocket}
         *
         * Respond to {@link Request} objects with a {@link Response} object.
         */
        fetch(
            this: Server,
            request: Request,
            server: Server,
        ): Response | undefined | void | Promise<Response | undefined | void>;
    }

    interface TLSWebSocketServeOptions<WebSocketDataType = undefined>
        extends WebSocketServeOptions<WebSocketDataType>,
        TLSOptions {
        unix?: never;
        tls?: TLSOptions | TLSOptions[];
    }

    type Serve<WebSocketDataType = undefined> =
        | ServeOptions
        | TLSServeOptions
        | WebSocketServeOptions<WebSocketDataType>
        | TLSWebSocketServeOptions<WebSocketDataType>;

    /**
     * HTTP & HTTPS Server
     *
     * To start the server, see {@link serve}
     *
     * For performance, Bun pre-allocates most of the data for 2048 concurrent requests.
     * That means starting a new server allocates about 500 KB of memory. Try to
     * avoid starting and stopping the server often (unless it's a new instance of bun).
     *
     * Powered by a fork of [uWebSockets](https://github.com/uNetworking/uWebSockets). Thank you @alexhultman.
     */
    interface Server extends Disposable {
        /**
         * Stop listening to prevent new connections from being accepted.
         *
         * By default, it does not cancel in-flight requests or websockets. That means it may take some time before all network activity stops.
         *
         * @param closeActiveConnections Immediately terminate in-flight requests, websockets, and stop accepting new connections.
         * @default false
         */
        stop(closeActiveConnections?: boolean): Promise<void>;

        /**
         * Update the `fetch` and `error` handlers without restarting the server.
         *
         * This is useful if you want to change the behavior of your server without
         * restarting it or for hot reloading.
         *
         * @example
         *
         * ```js
         * // create the server
         * const server = Bun.serve({
         *  fetch(request) {
         *    return new Response("Hello World v1")
         *  }
         * });
         *
         * // Update the server to return a different response
         * server.reload({
         *   fetch(request) {
         *     return new Response("Hello World v2")
         *   }
         * });
         * ```
         *
         * Passing other options such as `port` or `hostname` won't do anything.
         */
        reload(options: Serve): void;

        /**
         * Mock the fetch handler for a running server.
         *
         * This feature is not fully implemented yet. It doesn't normalize URLs
         * consistently in all cases and it doesn't yet call the `error` handler
         * consistently. This needs to be fixed
         */
        fetch(request: Request | string): Response | Promise<Response>;

        /**
         * Upgrade a {@link Request} to a {@link ServerWebSocket}
         *
         * @param request The {@link Request} to upgrade
         * @param options Pass headers or attach data to the {@link ServerWebSocket}
         *
         * @returns `true` if the upgrade was successful and `false` if it failed
         *
         * @example
         * ```js
         * import { serve } from "bun";
         *  serve({
         *    websocket: {
         *      open: (ws) => {
         *        console.log("Client connected");
         *      },
         *      message: (ws, message) => {
         *        console.log("Client sent message", message);
         *      },
         *      close: (ws) => {
         *        console.log("Client disconnected");
         *      },
         *    },
         *    fetch(req, server) {
         *      const url = new URL(req.url);
         *      if (url.pathname === "/chat") {
         *        const upgraded = server.upgrade(req);
         *        if (!upgraded) {
         *          return new Response("Upgrade failed", { status: 400 });
         *        }
         *      }
         *      return new Response("Hello World");
         *    },
         *  });
         * ```
         *  What you pass to `data` is available on the {@link ServerWebSocket.data} property
         */
        // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
        upgrade<T = undefined>(
            request: Request,
            options?: {
                /**
                 * Send any additional headers while upgrading, like cookies
                 */
                headers?: Bun.HeadersInit;
                /**
                 * This value is passed to the {@link ServerWebSocket.data} property
                 */
                data?: T;
            },
        ): boolean;

        /**
         * Send a message to all connected {@link ServerWebSocket} subscribed to a topic
         *
         * @param topic The topic to publish to
         * @param data The data to send
         * @param compress Should the data be compressed? Ignored if the client does not support compression.
         *
         * @returns 0 if the message was dropped, -1 if backpressure was applied, or the number of bytes sent.
         *
         * @example
         *
         * ```js
         * server.publish("chat", "Hello World");
         * ```
         *
         * @example
         * ```js
         * server.publish("chat", new Uint8Array([1, 2, 3, 4]));
         * ```
         *
         * @example
         * ```js
         * server.publish("chat", new ArrayBuffer(4), true);
         * ```
         *
         * @example
         * ```js
         * server.publish("chat", new DataView(new ArrayBuffer(4)));
         * ```
         */
        publish(
            topic: string,
            data: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer,
            compress?: boolean,
        ): ServerWebSocketSendStatus;

        /**
         * A count of connections subscribed to a given topic
         *
         * This operation will loop through each topic internally to get the count.
         *
         * @param topic the websocket topic to check how many subscribers are connected to
         * @returns the number of subscribers
         */
        subscriberCount(topic: string): number;

        /**
         * Returns the client IP address and port of the given Request. If the request was closed or is a unix socket, returns null.
         *
         * @example
         * ```js
         * export default {
         *  async fetch(request, server) {
         *    return new Response(server.requestIP(request));
         *  }
         * }
         * ```
         */
        requestIP(request: Request): SocketAddress | null;

        /**
         * Reset the idleTimeout of the given Request to the number in seconds. 0 means no timeout.
         *
         * @example
         * ```js
         * export default {
         *  async fetch(request, server) {
         *    server.timeout(request, 60);
         *    await Bun.sleep(30000);
         *    return new Response("30 seconds have passed");
         *  }
         * }
         * ```
         */
        timeout(request: Request, seconds: number): void;
        /**
         * Undo a call to {@link Server.unref}
         *
         * If the Server has already been stopped, this does nothing.
         *
         * If {@link Server.ref} is called multiple times, this does nothing. Think of it as a boolean toggle.
         */
        ref(): void;

        /**
         * Don't keep the process alive if this server is the only thing left.
         * Active connections may continue to keep the process alive.
         *
         * By default, the server is ref'd.
         *
         * To prevent new connections from being accepted, use {@link Server.stop}
         */
        unref(): void;

        /**
         * How many requests are in-flight right now?
         */
        readonly pendingRequests: number;

        /**
         * How many {@link ServerWebSocket}s are in-flight right now?
         */
        readonly pendingWebSockets: number;

        readonly url: URL;

        readonly port: number;
        /**
         * The hostname the server is listening on. Does not include the port
         * @example
         * ```js
         * "localhost"
         * ```
         */
        readonly hostname: string;
        /**
         * Is the server running in development mode?
         *
         * In development mode, `Bun.serve()` returns rendered error messages with
         * stack traces instead of a generic 500 error. This makes debugging easier,
         * but development mode shouldn't be used in production or you will risk
         * leaking sensitive information.
         */
        readonly development: boolean;

        /**
         * An identifier of the server instance
         *
         * When bun is started with the `--hot` flag, this ID is used to hot reload the server without interrupting pending requests or websockets.
         *
         * When bun is not started with the `--hot` flag, this ID is currently unused.
         */
        readonly id: string;
    }

    /**
     * Start a fast HTTP server.
     *
     * @param options Server options (port defaults to $PORT || 3000)
     *
     * -----
     *
     * @example
     *
     * ```ts
     * Bun.serve({
     *   fetch(req: Request): Response | Promise<Response> {
     *     return new Response("Hello World!");
     *   },
     *
     *   // Optional port number - the default value is 3000
     *   port: process.env.PORT || 3000,
     * });
     * ```
     * -----
     *
     * @example
     *
     * Send a file
     *
     * ```ts
     * Bun.serve({
     *   fetch(req: Request): Response | Promise<Response> {
     *     return new Response(Bun.file("./package.json"));
     *   },
     *
     *   // Optional port number - the default value is 3000
     *   port: process.env.PORT || 3000,
     * });
     * ```
     */
    // eslint-disable-next-line @definitelytyped/no-unnecessary-generics
    function serve<T>(options: Serve<T>): Server;

    interface SocketListener<Data = undefined> extends Disposable {
        stop(closeActiveConnections?: boolean): void;
        ref(): void;
        unref(): void;
        reload(options: Pick<Partial<SocketOptions>, "socket">): void;
        data: Data;
    }
    interface TCPSocketListener<Data = unknown> extends SocketListener<Data> {
        readonly port: number;
        readonly hostname: string;
    }

    interface Socket<Data = undefined> extends Disposable {
        /**
         * Write `data` to the socket
         *
         * @param data The data to write to the socket
         * @param byteOffset The offset in the buffer to start writing from (defaults to 0)
         * @param byteLength The number of bytes to write (defaults to the length of the buffer)
         *
         * When passed a string, `byteOffset` and `byteLength` refer to the UTF-8 offset, not the string character offset.
         *
         * This is unbuffered as of Bun v0.2.2. That means individual write() calls
         * will be slow. In the future, Bun will buffer writes and flush them at the
         * end of the tick, when the event loop is idle, or sooner if the buffer is full.
         */
        write(
            data: string | BufferSource,
            byteOffset?: number,
            byteLength?: number,
        ): number;

        /**
         * The data context for the socket.
         */
        data: Data;

        /**
         * Like {@link Socket.write} except it includes a TCP FIN packet
         *
         * Use it to send your last message and close the connection.
         */
        end(
            data?: string | BufferSource,
            byteOffset?: number,
            byteLength?: number,
        ): number;

        /**
         * Close the socket immediately
         */
        end(): void;

        /**
         * Keep Bun's process alive at least until this socket is closed
         *
         * After the socket has closed, the socket is unref'd, the process may exit,
         * and this becomes a no-op
         */
        ref(): void;

        /**
         * Set a timeout until the socket automatically closes.
         *
         * To reset the timeout, call this function again.
         *
         * When a timeout happens, the `timeout` callback is called and the socket is closed.
         */
        timeout(seconds: number): void;

        /**
         * Forcefully close the socket. The other end may not receive all data, and
         * the socket will be closed immediately.
         *
         * This passes `SO_LINGER` with `l_onoff` set to `1` and `l_linger` set to
         * `0` and then calls `close(2)`.
         */
        terminate(): void;

        /**
         * Shutdown writes to a socket
         *
         * This makes the socket a half-closed socket. It can still receive data.
         *
         * This calls [shutdown(2)](https://man7.org/linux/man-pages/man2/shutdown.2.html) internally
         */
        shutdown(halfClose?: boolean): void;

        readonly readyState: "open" | "closing" | "closed";

        /**
         * Allow Bun's process to exit even if this socket is still open
         *
         * After the socket has closed, this function does nothing.
         */
        unref(): void;

        /**
         * Flush any buffered data to the socket
         */
        flush(): void;

        /**
         * Reset the socket's callbacks. This is useful with `bun --hot` to facilitate hot reloading.
         *
         * This will apply to all sockets from the same {@link Listener}. it is per socket only for {@link Bun.connect}.
         */
        reload(handler: SocketHandler): void;

        /**
         * Get the server that created this socket
         *
         * This will return undefined if the socket was created by {@link Bun.connect} or if the listener has already closed.
         */
        readonly listener?: SocketListener;

        /**
         * Remote IP address connected to the socket
         */
        readonly remoteAddress: string;

        /**
         * local port connected to the socket
         */
        readonly localPort: number;

        /**
         * This property is `true` if the peer certificate was signed by one of the CAs
         * specified when creating the `Socket` instance, otherwise `false`.
         */
        readonly authorized: boolean;

        /**
         * String containing the selected ALPN protocol.
         * Before a handshake has completed, this value is always null.
         * When a handshake is completed but not ALPN protocol was selected, socket.alpnProtocol equals false.
         */
        readonly alpnProtocol: string | false | null;

        /**
         * Disables TLS renegotiation for this `Socket` instance. Once called, attempts
         * to renegotiate will trigger an `error` handler on the `Socket`.
         *
         * There is no support for renegotiation as a server. (Attempts by clients will result in a fatal alert so that ClientHello messages cannot be used to flood a server and escape higher-level limits.)
         */
        disableRenegotiation(): void;

        /**
         * Keying material is used for validations to prevent different kind of attacks in
         * network protocols, for example in the specifications of IEEE 802.1X.
         *
         * Example
         *
         * ```js
         * const keyingMaterial = socket.exportKeyingMaterial(
         *   128,
         *   'client finished');
         *
         * /*
         *  Example return value of keyingMaterial:
         *  <Buffer 76 26 af 99 c5 56 8e 42 09 91 ef 9f 93 cb ad 6c 7b 65 f8 53 f1 d8 d9
         *     12 5a 33 b8 b5 25 df 7b 37 9f e0 e2 4f b8 67 83 a3 2f cd 5d 41 42 4c 91
         *     74 ef 2c ... 78 more bytes>
         *
         * ```
         *
         * @param length number of bytes to retrieve from keying material
         * @param label an application specific label, typically this will be a value from the [IANA Exporter Label
         * Registry](https://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml#exporter-labels).
         * @param context Optionally provide a context.
         * @return requested bytes of the keying material
         */
        exportKeyingMaterial(
            length: number,
            label: string,
            context: Buffer,
        ): Buffer;

        /**
         * Returns the reason why the peer's certificate was not been verified. This
         * property is set only when `socket.authorized === false`.
         */
        getAuthorizationError(): Error | null;

        /**
         * Returns an object representing the local certificate. The returned object has
         * some properties corresponding to the fields of the certificate.
         *
         * If there is no local certificate, an empty object will be returned. If the
         * socket has been destroyed, `null` will be returned.
         */
        getCertificate(): PeerCertificate | object | null;

        /**
         * Returns an object containing information on the negotiated cipher suite.
         *
         * For example, a TLSv1.2 protocol with AES256-SHA cipher:
         *
         * ```json
         * {
         *     "name": "AES256-SHA",
         *     "standardName": "TLS_RSA_WITH_AES_256_CBC_SHA",
         *     "version": "SSLv3"
         * }
         * ```
         *
         */
        getCipher(): CipherNameAndProtocol;

        /**
         * Returns an object representing the type, name, and size of parameter of
         * an ephemeral key exchange in `perfect forward secrecy` on a client
         * connection. It returns an empty object when the key exchange is not
         * ephemeral. As this is only supported on a client socket; `null` is returned
         * if called on a server socket. The supported types are `'DH'` and `'ECDH'`. The`name` property is available only when type is `'ECDH'`.
         *
         * For example: `{ type: 'ECDH', name: 'prime256v1', size: 256 }`.
         */
        getEphemeralKeyInfo(): EphemeralKeyInfo | object | null;

        /**
         * Returns an object representing the peer's certificate. If the peer does not
         * provide a certificate, an empty object will be returned. If the socket has been
         * destroyed, `null` will be returned.
         *
         * If the full certificate chain was requested, each certificate will include an`issuerCertificate` property containing an object representing its issuer's
         * certificate.
         * @return A certificate object.
         */
        getPeerCertificate(): PeerCertificate;

        /**
         * See [SSL\_get\_shared\_sigalgs](https://www.openssl.org/docs/man1.1.1/man3/SSL_get_shared_sigalgs.html) for more information.
         * @since v12.11.0
         * @return List of signature algorithms shared between the server and the client in the order of decreasing preference.
         */
        getSharedSigalgs(): string[];

        /**
         * As the `Finished` messages are message digests of the complete handshake
         * (with a total of 192 bits for TLS 1.0 and more for SSL 3.0), they can
         * be used for external authentication procedures when the authentication
         * provided by SSL/TLS is not desired or is not enough.
         *
         * @return The latest `Finished` message that has been sent to the socket as part of a SSL/TLS handshake, or `undefined` if no `Finished` message has been sent yet.
         */
        getTLSFinishedMessage(): Buffer | undefined;

        /**
         * As the `Finished` messages are message digests of the complete handshake
         * (with a total of 192 bits for TLS 1.0 and more for SSL 3.0), they can
         * be used for external authentication procedures when the authentication
         * provided by SSL/TLS is not desired or is not enough.
         *
         * @return The latest `Finished` message that is expected or has actually been received from the socket as part of a SSL/TLS handshake, or `undefined` if there is no `Finished` message so
         * far.
         */
        getTLSPeerFinishedMessage(): Buffer | undefined;

        /**
         * For a client, returns the TLS session ticket if one is available, or`undefined`. For a server, always returns `undefined`.
         *
         * It may be useful for debugging.
         *
         * See `Session Resumption` for more information.
         */
        getTLSTicket(): Buffer | undefined;

        /**
         * Returns a string containing the negotiated SSL/TLS protocol version of the
         * current connection. The value `'unknown'` will be returned for connected
         * sockets that have not completed the handshaking process. The value `null` will
         * be returned for server sockets or disconnected client sockets.
         *
         * Protocol versions are:
         *
         * * `'SSLv3'`
         * * `'TLSv1'`
         * * `'TLSv1.1'`
         * * `'TLSv1.2'`
         * * `'TLSv1.3'`
         *
         */
        getTLSVersion(): string;

        /**
         * See `Session Resumption` for more information.
         * @return `true` if the session was reused, `false` otherwise.
         */
        isSessionReused(): boolean;

        /**
         * The `socket.setMaxSendFragment()` method sets the maximum TLS fragment size.
         * Returns `true` if setting the limit succeeded; `false` otherwise.
         *
         * Smaller fragment sizes decrease the buffering latency on the client: larger
         * fragments are buffered by the TLS layer until the entire fragment is received
         * and its integrity is verified; large fragments can span multiple roundtrips
         * and their processing can be delayed due to packet loss or reordering. However,
         * smaller fragments add extra TLS framing bytes and CPU overhead, which may
         * decrease overall server throughput.
         * @param [size=16384] The maximum TLS fragment size. The maximum value is `16384`.
         */
        setMaxSendFragment(size: number): boolean;

        /**
         * Enable/disable the use of Nagle's algorithm.
         * Only available for already connected sockets, will return false otherwise
         * @param noDelay Default: `true`
         * @returns true if is able to setNoDelay and false if it fails.
         */
        setNoDelay(noDelay?: boolean): boolean;

        /**
         * Enable/disable keep-alive functionality, and optionally set the initial delay before the first keepalive probe is sent on an idle socket.
         * Set `initialDelay` (in milliseconds) to set the delay between the last data packet received and the first keepalive probe.
         * Only available for already connected sockets, will return false otherwise.
         *
         * Enabling the keep-alive functionality will set the following socket options:
         * SO_KEEPALIVE=1
         * TCP_KEEPIDLE=initialDelay
         * TCP_KEEPCNT=10
         * TCP_KEEPINTVL=1
         * @param enable Default: `false`
         * @param initialDelay Default: `0`
         * @returns true if is able to setNoDelay and false if it fails.
         */
        setKeepAlive(enable?: boolean, initialDelay?: number): boolean;

        /**
         * The number of bytes written to the socket.
         */
        readonly bytesWritten: number;
    }

    interface BinaryTypeList {
        arraybuffer: ArrayBuffer;
        buffer: Buffer;
        uint8array: Uint8Array;
        // TODO: DataView
        // dataview: DataView;
    }
    type BinaryType = keyof BinaryTypeList;

    interface SocketHandler<
        Data = unknown,
        DataBinaryType extends BinaryType = "buffer",
    > {
        /**
         * Is called when the socket connects, or in case of TLS if no handshake is provided
         * this will be called only after handshake
         * @param socket
         */
        open?(socket: Socket<Data>): void | Promise<void>;
        close?(socket: Socket<Data>): void | Promise<void>;
        error?(socket: Socket<Data>, error: Error): void | Promise<void>;
        data?(
            socket: Socket<Data>,
            data: BinaryTypeList[DataBinaryType],
        ): void | Promise<void>;
        drain?(socket: Socket<Data>): void | Promise<void>;

        /**
         * When handshake is completed, this functions is called.
         * @param socket
         * @param success Indicates if the server authorized despite the authorizationError.
         * @param authorizationError Certificate Authorization Error or null.
         */
        handshake?(
            socket: Socket<Data>,
            success: boolean,
            authorizationError: Error | null,
        ): void;

        /**
         * When the socket has been shutdown from the other end, this function is
         * called. This is a TCP FIN packet.
         */
        end?(socket: Socket<Data>): void | Promise<void>;

        /**
         * When the socket fails to be created, this function is called.
         *
         * The promise returned by `Bun.connect` rejects **after** this function is
         * called.
         *
         * When `connectError` is specified, the rejected promise will not be
         * added to the promise rejection queue (so it won't be reported as an
         * unhandled promise rejection, since connectError handles it).
         *
         * When `connectError` is not specified, the rejected promise will be added
         * to the promise rejection queue.
         */
        connectError?(socket: Socket<Data>, error: Error): void | Promise<void>;

        /**
         * Called when a message times out.
         */
        timeout?(socket: Socket<Data>): void | Promise<void>;
        /**
         * Choose what `ArrayBufferView` is returned in the {@link SocketHandler.data} callback.
         *
         * @default "buffer"
         *
         * @remarks
         * This lets you select the desired binary type for the `data` callback.
         * It's a small performance optimization to let you avoid creating extra
         * ArrayBufferView objects when possible.
         *
         * Bun originally defaulted to `Uint8Array` but when dealing with network
         * data, it's more useful to be able to directly read from the bytes which
         * `Buffer` allows.
         */
        binaryType?: BinaryType;
    }

    interface SocketOptions<Data = unknown> {
        socket: SocketHandler<Data>;
        data?: Data;
    }

    interface TCPSocketListenOptions<Data = undefined> extends SocketOptions<Data> {
        hostname: string;
        port: number;
        tls?: TLSOptions;
        exclusive?: boolean;
        allowHalfOpen?: boolean;
    }

    interface TCPSocketConnectOptions<Data = undefined>
        extends SocketOptions<Data> {
        hostname: string;
        port: number;
        tls?: boolean;
        exclusive?: boolean;
        allowHalfOpen?: boolean;
    }

    /**
     * Create a TCP server that listens on a port
     *
     * @param options The options to use when creating the server
     * @param options.socket The socket handler to use
     * @param options.data The per-instance data context
     * @param options.hostname The hostname to connect to
     * @param options.port The port to connect to
     * @param options.tls The TLS configuration object
     * @param options.unix The unix socket to connect to
     */
    function listen<Data = undefined>(
        options: TCPSocketListenOptions<Data>,
    ): TCPSocketListener<Data>;

    function connect<Data = undefined>(
        options: TCPSocketConnectOptions<Data>,
    ): Promise<Socket<Data>>;
}
