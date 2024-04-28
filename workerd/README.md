# Function Stubs for Cloudflare Workers

Some of the modules in this packages uses dynamic imports for Node.js built-in
and third-party libraries, which cannot be resolved by Wrangler, causing it
to fail to build or start the dev server.

Since the functions uses these libraries are not for Cloudflare Workers anyway,
so we provide stubs for them instead. When Cloudflare Workers (Wrangler) tries
to import these modules, the stub version will be returned.

This strategy makes all modules, especially the main entry of this package
applicable in Cloudflare Workers, for the functions that are not supported by
the runtime, a `Runtime unsupported` error will be thrown instead.
