# JsExt

Additional functions for JavaScript to build strong applications.

## Import

The recommended way is to only import the ones that are needed:

```js
// Node.js, Bun, Deno (JSR) or Cloudflare Workers
import _try from "@ayonli/jsext/try";
import func from "@ayonli/jsext/func";
// ...

// Deno (URL)
import _try from "https://lib.deno.dev/x/ayonli_jsext@latest/try.ts";
import func from "https://lib.deno.dev/x/ayonli_jsext@latest/func.ts";
// ...

// Browsers (ESM)
import _try from "https://ayonli.github.io/jsext/esm/try.js";
import func from "https://ayonli.github.io/jsext/esm/func.js";
// ...
```

There is also a bundled version that can be loaded via a `<script>` tag in the
browser.

```html
<script src="https://ayonli.github.io/jsext/bundle/jsext.js">
    // this will also include the sub-modules and augmentations
</script>
```

## Functions

- [_try](#_try) Calls a function safely and return errors when captured.
- [func](#func) Defines a function along with a `defer` keyword, inspired by
  Golang.
- [wrap](#wrap) Wraps a function for decorator pattern but keep its signature.
- [throttle](#throttle) Throttles function calls for frequent access.
- [debounce](#debounce) Debounces function calls for frequent access.
- [queue](#queue) Handles tasks sequentially and prevent concurrency conflicts.
- [lock](#lock) Provides mutual exclusion for concurrent operations.
- [read](#read) Makes any streaming source readable via `for await ... of ...`
  syntax.
- [readAll](#readall) Reads all streaming data at once.
- [chan](#chan) Creates a channel that transfers data across routines, even
  across multiple threads, inspired by Golang.
- [parallel](#parallel) Runs functions in parallel threads and take advantage of
  multi-core CPUs, inspired by Golang.
- [run](#run) Runs a script in another thread and abort at any time.
- [example](#example) Writes unit tests as if writing examples, inspired by
  Golang.
- [deprecate](#deprecate) Marks a function as deprecated and emit warnings when
  it is called.

And more functions in [sub-categories](#sub-categories).

### _try

```ts
declare function _try<E = unknown, R = any, A extends any[] = any[]>(
  fn: (...args: A) => R,
  ...args: A
): [E, R];
declare function _try<E = unknown, R = any, A extends any[] = any[]>(
  fn: (...args: A) => Promise<R>,
  ...args: A
): Promise<[E, R]>;
```

Invokes a regular function or an async function and renders its result in an
`[err, res]` tuple.

**Example (regular function)**

```ts
import _try from "@ayonli/jsext/try";

const [err, res] = _try(() => {
  // do something that may fail
});
```

**Example (async function)**

```ts
import _try from "@ayonli/jsext/try";
import axios from "axios";

let [err, res] = await _try(async () => {
  return await axios.get("https://example.org");
});

if (err) {
  res = (err as any)["response"];
}
```

---

```ts
declare function _try<E = unknown, R = any>(job: Promise<R>): Promise<[E, R]>;
```

Resolves a promise and renders its result in an `[err, res]` tuple.

**Example (promise)**

```ts
import _try from "@ayonli/jsext/try";
import axios from "axios";

let [err, res] = await _try(axios.get("https://example.org"));

if (err) {
  res = (err as any)["response"];
}
```

---

```ts
declare function _try<
  E = unknown,
  T = any,
  A extends any[] = any[],
  TReturn = any,
  TNext = unknown,
>(
  fn: (...args: A) => Generator<T, TReturn, TNext>,
  ...args: A
): Generator<[E, T], [E, TReturn], TNext>;
declare function _try<
  E = unknown,
  T = any,
  A extends any[] = any[],
  TReturn = any,
  TNext = unknown,
>(
  fn: (...args: A) => AsyncGenerator<T, TReturn, TNext>,
  ...args: A
): AsyncGenerator<[E, T], [E, TReturn], TNext>;
```

Invokes a generator function or an async generator function and renders its
yield value and result in an `[err, val]` tuple.

**Example (generator function)**

```ts
import _try from "@ayonli/jsext/try";

const iter = _try(function* () {
  // do something that may fail
});

for (const [err, val] of iter) {
  if (err) {
    console.error("something went wrong:", err);
  } else {
    console.log("current value:", val);
  }
}
```

**Example (async generator function)**

```ts
import _try from "@ayonli/jsext/try";

const iter = _try(async function* () {
  // do something that may fail
});

for await (const [err, val] of iter) {
  if (err) {
    console.error("something went wrong:", err);
  } else {
    console.log("current value:", val);
  }
}
```

---

```ts
declare function _try<E = unknown, T = any, TReturn = any, TNext = unknown>(
  gen: Generator<T, TReturn, TNext>,
): Generator<[E, T], [E, TReturn], TNext>;
declare function _try<E = unknown, T = any, TReturn = any, TNext = unknown>(
  gen: AsyncGenerator<T, TReturn, TNext>,
): AsyncGenerator<[E, T], [E, TReturn], TNext>;
```

Resolves a generator or an async generator and renders its yield value and
result in an `[err, val]` tuple.

**Example (generator)**

```ts
import _try from "@ayonli/jsext/try";
import { sequence } from "@ayonli/jsext/number";

const iter = sequence(1, 10);

for (const [err, val] of _try(iter)) {
  if (err) {
    console.error("something went wrong:", err);
  } else {
    console.log("current value:", val);
  }
}
```

**Example (async generator)**

```ts
import _try from "@ayonli/jsext/try";

async function* gen() {
  // do something that may fail
}

for await (const [err, val] of _try(gen())) {
  if (err) {
    console.error("something went wrong:", err);
  } else {
    console.log("current value:", val);
  }
}
```

---

### func

```ts
declare function func<T, R = any, A extends any[] = any[]>(
  fn: (this: T, defer: (cb: () => void) => void, ...args: A) => R,
): (this: T, ...args: A) => R;
```

Inspired by Golang, creates a function that receives a `defer` keyword which can
be used to carry deferred jobs that will be run after the main function is
complete.

Multiple calls of the `defer` keyword is supported, and the callbacks are called
in the LIFO order. Callbacks can be async functions if the main function is an
async function or an async generator function, and all the running procedures
will be awaited.

**Example**

```ts
import func from "@ayonli/jsext/func";
import * as fs from "node:fs/promises";

export const getVersion = func(async (defer) => {
  const file = await fs.open("./package.json", "r");
  defer(() => file.close());

  const content = await file.readFile("utf8");
  const pkg = JSON.parse(content);

  return pkg.version as string;
});
```

---

### wrap

```ts
declare function wrap<T, Fn extends (this: T, ...args: any[]) => any>(
  fn: Fn,
  wrapper: (this: T, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>,
): Fn;
```

Wraps a function inside another function and returns a new function that copies
the original function's name and other properties.

**Example**

```ts
import wrap from "@ayonli/jsext/wrap";

function log(text: string) {
  console.log(text);
}

const show = wrap(log, function (fn, text) {
  return fn.call(this, new Date().toISOString() + " " + text);
});

console.log(show.name); // log
console.log(show.length); // 1
console.assert(show.toString() === log.toString());
```

---

### throttle

```ts
declare function throttle<I, Fn extends (this: I, ...args: any[]) => any>(
  handler: Fn,
  duration: number,
): Fn;
declare function throttle<I, Fn extends (this: I, ...args: any[]) => any>(
  handler: Fn,
  options: {
    duration: number;
    /**
     * Use the throttle strategy `for` the given key, this will keep the
     * result in a global cache, binding new `handler` function for the same
     * key will result in the same result as the previous, unless the
     * duration has passed. This mechanism guarantees that both creating the
     * throttled function in function scopes and overwriting the handler are
     * possible.
     */
    for?: any;
    /**
     * When turned on, respond with the last cache (if available)
     * immediately, even if it has expired, and update the cache in the
     * background.
     */
    noWait?: boolean;
  },
): Fn;
```

Creates a throttled function that will only be run once in a certain amount of
time.

If a subsequent call happens within the `duration` (in milliseconds), the
previous result will be returned and the `handler` function will not be invoked.

**Example**

```ts
import throttle from "@ayonli/jsext/throttle";
import { sleep } from "@ayonli/jsext/promise";

const fn = throttle((input: string) => input, 1_000);
console.log(fn("foo")); // foo
console.log(fn("bar")); // foo

await sleep(1_000);
console.log(fn("bar")); // bar
```

**Example (with key)**

```ts
import throttle from "@ayonli/jsext/throttle";
import { sleep } from "@ayonli/jsext/promise";

const out1 = await throttle(() => Promise.resolve("foo"), {
  duration: 1_000,
  for: "example",
})();
console.log(out1); // foo

const out2 = await throttle(() => Promise.resolve("bar"), {
  duration: 1_000,
  for: "example",
})();
console.log(out2); // foo

await sleep(1_000);
const out3 = await throttle(() => Promise.resolve("bar"), {
  duration: 1_000,
  for: "example",
})();
console.log(out3); // bar
```

---

### debounce

```ts
declare function debounce<I, T, R>(
  handler: (this: I, data: T) => R | Promise<R>,
  delay: number,
  reducer?: (prev: T, data: T) => T,
): (this: I, data: T) => Promise<R>;
declare function debounce<I, T, R>(
  handler: (this: I, data: T) => R | Promise<R>,
  options: {
    delay: number;
    /**
     * Use the debounce strategy `for` the given key, this will keep the
     * debounce context in a global registry, binding new `handler` function
     * for the same key will override the previous settings. This mechanism
     * guarantees that both creating the debounced function in function
     * scopes and overwriting the handler are possible.
     */
    for?: any;
  },
  reducer?: (prev: T, data: T) => T,
): (this: I, data: T) => Promise<R>;
```

Creates a debounced function that delays invoking `handler` until after `delay`
duration (in milliseconds) have elapsed since the last time the debounced
function was invoked.

If a subsequent call happens within the `delay` duration (in milliseconds), the
previous call will be canceled and it will result in the same return value as
the new call's.

Optionally, we can provide a `reducer` function to merge data before processing
so multiple calls can be merged into one.

**Example**

```ts
import debounce from "@ayonli/jsext/debounce";
import { sleep } from "@ayonli/jsext/promise";

let count = 0;

const fn = debounce((obj: { foo?: string; bar?: string }) => {
  count++;
  return obj;
}, 1_000);

const [res1, res2] = await Promise.all([
  fn({ foo: "hello", bar: "world" }),
  sleep(100).then(() => fn({ foo: "hi" })),
]);

console.log(res1); // { foo: "hi" }
console.log(res2); // { foo: "hi" }
console.log(count); // 1
```

**Example (with reducer)**

```ts
import debounce from "@ayonli/jsext/debounce";

const fn = debounce(
  (obj: { foo?: string; bar?: string }) => {
    return obj;
  },
  1_000,
  (prev, current) => {
    return { ...prev, ...current };
  },
);

const [res1, res2] = await Promise.all([
  fn({ foo: "hello", bar: "world" }),
  fn({ foo: "hi" }),
]);

console.log(res1); // { foo: "hi", bar: "world" }
console.assert(res2 === res1);
```

**Example (with key)**

```ts
import debounce from "@ayonli/jsext/debounce";

const key = "unique_key";
let count = 0;

const [res1, res2] = await Promise.all([
  debounce(
    async (obj: { foo?: string; bar?: string }) => {
      count += 1;
      return await Promise.resolve(obj);
    },
    { delay: 5, for: key },
    (prev, data) => {
      return { ...prev, ...data };
    },
  )({ foo: "hello", bar: "world" }),

  debounce(
    async (obj: { foo?: string; bar?: string }) => {
      count += 2;
      return await Promise.resolve(obj);
    },
    { delay: 5, for: key },
    (prev, data) => {
      return { ...prev, ...data };
    },
  )({ foo: "hi" }),
]);

console.log(res1); // { foo: "hi", bar: "world" }
console.assert(res1 === res2);
console.assert(count === 2);
```

---

### queue

```ts
import type { Queue } from "@ayonli/jsext/queue";

declare function queue<T>(
  handler: (data: T) => Promise<void>,
  bufferSize?: number,
): Queue<T>;
```

Processes data sequentially by the given `handler` function and prevents
concurrency conflicts, it returns a `Queue` instance that we can push data into.

`bufferSize` is the maximum capacity of the underlying channel, once reached,
the push operation will block until there is new space available. By default,
this option is not set and use a non-buffered channel instead.

**Example**

```ts
import queue from "@ayonli/jsext/queue";

const list: string[] = [];
const q = queue(async (str: string) => {
  await Promise.resolve(null);
  list.push(str);
});

q.onError((err) => {
  console.error(err);
});

await q.push("foo");
await q.push("foo");

console.log(list.length);
q.close();
// output:
// 2
```

---

### lock

```ts
import type { Mutex } from "@ayonli/jsext/lock";

declare function lock(key: any): Promise<Mutex.Lock<undefined>>;
```

Acquires a mutex lock for the given key in order to perform concurrent
operations and prevent conflicts.

If the key is currently being locked by other coroutines, this function will
block until the lock becomes available again.

**Example**

```ts
import lock from "@ayonli/jsext/lock";
import func from "@ayonli/jsext/func";

const key = "unique_key";

export const concurrentOperation = func(async (defer) => {
  const ctx = await lock(key);
  defer(() => ctx.unlock()); // don't forget to unlock

  // This block will never be run if there are other coroutines holding
  // the lock.
  //
  // Other coroutines trying to lock the same key will also never be run
  // before `unlock()`.
});
```

Other than using the `lock()` function, we can also use `new Mutex()` to create
a mutex instance that holds some shared resource which can only be accessed by
one coroutine at a time.

**Example**

```ts
import { Mutex } from "@ayonli/jsext/lock";
import func from "@ayonli/jsext/func";
import { random } from "@ayonli/jsext/number";
import { sleep } from "@ayonli/jsext/promise";

const mutex = new Mutex(1);

const concurrentOperation = func(async (defer) => {
  const shared = await mutex.lock();
  defer(() => shared.unlock()); // don't forget to unlock

  const value1 = shared.value;

  await otherAsyncOperations();

  shared.value += 1;
  const value2 = shared.value;

  // Without mutex lock, the shared value may have been modified by other
  // calls during `await otherAsyncOperation()`, and the following
  // assertion will fail.
  console.assert(value1 + 1 === value2);
});

async function otherAsyncOperations() {
  await sleep(100 * random(1, 10));
}

await Promise.all([
  concurrentOperation(),
  concurrentOperation(),
  concurrentOperation(),
  concurrentOperation(),
]);
```

---

### read

```ts
declare function read<I extends AsyncIterable<any>>(iterable: I): I;
declare function read<T>(stream: ReadableStream<T>): AsyncIterable<T>;
declare function read(
  es: EventSource,
  options?: { event?: string },
): AsyncIterable<string>;
declare function read<T extends Uint8Array | string>(
  ws: WebSocket,
): AsyncIterable<T>;
declare function read<T>(target: EventTarget, eventMap?: {
  message?: string;
  error?: string;
  close?: string;
}): AsyncIterable<T>;
declare function read<T>(target: NodeJS.EventEmitter, eventMap?: {
  data?: string;
  error?: string;
  close?: string;
}): AsyncIterable<T>;
```

Wraps a source as an AsyncIterable object that can be used in the
`for await...of...` loop for reading streaming data.

**Example (ReadableStream)**

```ts
import read from "@ayonli/jsext/read";

const res = new Response("Hello, World!");

for await (const chunk of read(res.body!)) {
  console.log("receive chunk:", chunk);
}
```

**Example (EventSource)**

```ts
import read from "@ayonli/jsext/read";

// listen to the `onmessage`
const sse = new EventSource("/sse/message");

for await (const msg of read(sse)) {
  console.log("receive message:", msg);
}

// listen to a specific event
const channel = new EventSource("/sse/broadcast");

for await (const msg of read(channel, { event: "broadcast" })) {
  console.log("receive message:", msg);
}
```

**Example (WebSocket)**

```ts
import read from "@ayonli/jsext/read";

const ws = new WebSocket("/ws");

for await (const data of read(ws)) {
  if (typeof data === "string") {
    console.log("receive text message:", data);
  } else {
    console.log("receive binary data:", data);
  }
}
```

**Example (EventTarget)**

```ts
import read from "@ayonli/jsext/read";

for await (const msg of read(self)) {
  console.log("receive message from the parent window:", msg);
}
```

**Example (EventEmitter)**

```ts
import read from "@ayonli/jsext/read";

for await (const msg of read(process)) {
  console.log("receive message from the parent process:", msg);
}
```

---

### readAll

```ts
declare function readAll<T>(iterable: AsyncIterable<T>): Promise<T[]>;
```

Reads all values from the iterable object at once.

**Example**

```ts
import readAll from "@ayonli/jsext/readAll";
import * as fs from "node:fs";

const file = fs.createReadStream("./package.json");
const chunks = await readAll(file);

console.log(chunks);
```

---

### chan

```ts
import type { Channel } from "@ayonli/jsext/chan";

declare function chan<T>(capacity?: number): Channel<T>;
```

Inspired by Golang, cerates a `Channel` that can be used to transfer data across
routines.

If `capacity` is not set, a non-buffered channel will be created. For a
non-buffered channel, the sender and receiver must be present at the same time
(theoretically), otherwise, the channel will block (non-IO aspect).

If `capacity` is set, a buffered channel will be created. For a buffered
channel, data will be queued in the buffer first and then consumed by the
receiver in FIFO order. Once the buffer size reaches the capacity limit, no more
data will be sent unless there is new space available.

It is possible to set the `capacity` to `Infinity` to allow the channel to never
block and behave like a message queue.

Unlike `EventEmitter` or `EventTarget`, `Channel` guarantees the data will
always be delivered, even if there is no receiver at the moment.

Also, unlike Golang, `await channel.recv()` does not prevent the program from
exiting.

Channels can be used to send and receive streaming data between main thread and
worker threads wrapped by `parallel()`, but once used that way,
`channel.close()` must be explicitly called in order to release the channel for
garbage collection.

**Example (non-buffered)**

```ts
import chan from "@ayonli/jsext/chan";

const channel = chan<number>();

(async () => {
  await channel.send(123);
})();

const num = await channel.recv();
console.log(num); // 123
```

**Example (buffered)**

```ts
import chan from "@ayonli/jsext/chan";

const channel = chan<number>(3);

await channel.send(123);
await channel.send(456);
await channel.send(789);

const num1 = await channel.recv();
const num2 = await channel.recv();
const num3 = await channel.recv();

console.log(num1); // 123
console.log(num2); // 456
console.log(num3); // 789
```

**Example (iterable)**

```ts
import chan from "@ayonli/jsext/chan";
import { sequence } from "@ayonli/jsext/number";

const channel = chan<number>();

(async () => {
  for (const num of sequence(1, 5)) {
    await channel.send(num);
  }

  channel.close();
})();

for await (const num of channel) {
  console.log(num);
}
// output:
// 1
// 2
// 3
// 4
// 5
```

---

### parallel

```ts
import type { ThreadedFunctions } from "@ayonli/jsext/parallel";

declare function parallel<M extends { [x: string]: any }>(
  mod: string | (() => Promise<M>),
): ThreadedFunctions<M>;
```

Wraps a module so its functions will be run in worker threads.

In Node.js and Bun, the `module` can be either an ES module or a CommonJS
module, **node_modules** and built-in modules are also supported.

In browsers and Deno, the `module` can only be an ES module.

Data are cloned and transferred between threads via **Structured Clone**
**Algorithm**.

Apart from the standard data types supported by the algorithm, `Channel` can
also be used to transfer data between threads. To do so, just passed a channel
instance to the threaded function. But be aware, channel can only be used as a
parameter, return a channel from the threaded function is not allowed. Once
passed, the data can only be transferred into and out-from the function.

The difference between using a channel and a generator function for streaming
processing is, for a generator function, `next(value)` is coupled with a
`yield value`, the process is blocked between **next** calls, channel doesn't
have this limit, we can use it to stream all the data into the function before
processing and receiving any result.

The threaded function also supports `ArrayBuffer`s as transferable objects. If
an array buffer is presented as an argument or the direct property of an
argument (assume it's a plain object), or the array buffer is the return value
or the direct property of the return value (assume it's a plain object), it
automatically becomes a transferrable object and will be transferred to the
other thread instead of being cloned. This strategy allows us to easily compose
objects like `Request` and `Response` instances into plain objects and pass them
between threads without overhead.

**NOTE:** If the current module is already in a worker thread, use this function
won't create another worker thread.

**NOTE:** Cloning and transferring data between the main thread and worker
threads are very heavy and slow, worker threads are only intended to run
CPU-intensive tasks or divide tasks among multiple threads, they have no
advantage when performing IO-intensive tasks such as handling HTTP requests,
always prefer `cluster` module for that kind of purpose.

**NOTE:** For error instances, only the following types are guaranteed to be
sent and received properly between threads.

- `Error`
- `EvalError`
- `RangeError`
- `ReferenceError`
- `SyntaxError`
- `TypeError`
- `URIError`
- `AggregateError` (as arguments, return values, thrown values, or shallow
  object properties)
- `Exception` (as arguments, return values, thrown values, or shallow object
  properties)
- `DOMException` (as arguments, return values, thrown values, or shallow object
  properties)

In order to handle errors properly between threads, throw well-known error types
or use `Exception` (or `DOMException`) with error names in the threaded
function.

**Example (regular or async function)**

```ts
import parallel from "@ayonli/jsext/parallel";

const mod = parallel(() => import("./examples/worker.mjs"));
console.log(await mod.greet("World")); // Hi, World
```

**Example (generator or async generator function)**

```ts
import parallel from "@ayonli/jsext/parallel";

const mod = parallel(() => import("./examples/worker.mjs"));

for await (const word of mod.sequence(["foo", "bar"])) {
  console.log(word);
}
// output:
// foo
// bar
```

**Example (use channel)**

```ts
import parallel from "@ayonli/jsext/parallel";
import chan from "@ayonli/jsext/chan";
import { sequence } from "@ayonli/jsext/number";
import { readAll } from "@ayonli/jsext/read";

const mod = parallel(() => import("./examples/worker.mjs"));

const channel = chan<{ value: number; done: boolean }>();
const length = mod.twoTimesValues(channel);

for (const value of sequence(0, 9)) {
  await channel.send({ value, done: value === 9 });
}

const results = (await readAll(channel)).map((item) => item.value);
console.log(results); // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
console.log(await length); // 10
```

**Example (use transferrable)**

```ts
import parallel from "@ayonli/jsext/parallel";

const mod = parallel(() => import("./examples/worker.mjs"));

const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const length = await mod.transfer(arr.buffer);

console.log(length); // 10
console.log(arr.length); // 0
```

**NOTE:** If the application is to be bundled, use the following syntax to link
the module instead, it will prevent the bundler from including the file and
rewriting the path.

```ts
const mod = parallel<typeof import("./examples/worker.mjs")>(
  "./examples/worker.mjs",
);
```

---

```ts
namespace parallel {
  /**
   * The maximum number of workers allowed to exist at the same time. If not
   * set, the program by default uses CPU core numbers as the limit.
   */
  export var maxWorkers: number | undefined;

  /**
   * In browsers, by default, the program loads the worker entry directly from
   * GitHub, which could be slow due to poor internet connection, we can copy
   * the entry file `bundle/worker.mjs` to a local path of our website and set
   * this option to that path so that it can be loaded locally.
   *
   * Or, if the code is bundled, the program won't be able to automatically
   * locate the entry file in the file system, in such case, we can also copy
   * the entry file (`bundle/worker.mjs` for Bun, Deno and the browser,
   * `bundle/worker-node.mjs` for Node.js) to a local directory and supply
   * this option instead.
   */
  export var workerEntry: string | undefined;
}
```

---

### run

```ts
declare function run<R, A extends any[] = any[]>(
  script: string,
  args?: A,
  options?: {
    /**
     * If not set, invoke the default function, otherwise invoke the specified
     * function.
     */
    fn?: string;
    /** Automatically abort the task when timeout (in milliseconds). */
    timeout?: number;
    /**
     * Instead of dropping the worker after the task has completed, keep it
     * alive so that it can be reused by other tasks.
     */
    keepAlive?: boolean;
    /**
     * Choose whether to use `worker_threads` or `child_process` for running
     * the script. The default setting is `worker_threads`.
     *
     * In browsers and Deno, this option is ignored and will always use the web
     * worker.
     *
     * @deprecated Always prefer `worker_threads` over `child_process` since it
     * consumes less system resources and `child_process` may not work in
     * Windows. `child_process` support may be removed in the future once
     * considered thoroughly.
     */
    adapter?: "worker_threads" | "child_process";
  },
): Promise<{
  workerId: number;
  /** Retrieves the return value of the function being called. */
  result(): Promise<R>;
  /** Iterates the yield value if the function being called returns a generator. */
  iterate(): AsyncIterable<R>;
  /** Terminates the worker thread and aborts the task. */
  abort(reason?: Error | null): Promise<void>;
}>;
```

Runs the given `script` in a worker thread and abort the task at any time.

This function is similar to `parallel()`, many features applicable to
`parallel()` are also applicable to `run()`, except the following:

1. The `script` can only be a filename, and is relative to the current working
   directory (or the current URL) if not absolute.
2. Only one task is allow to run at a time for one worker thread, set
   `run.maxWorkers` to allow more tasks to be run at the same time if needed.
3. By default, the worker thread is dropped after the task settles, set
   `keepAlive` option in order to reused it.

**Example (result)**

```ts
import run from "@ayonli/jsext/run";

const job1 = await run<string, [string]>("examples/worker.mjs", ["World"]);
console.log(await job1.result()); // Hello, World
```

**Example (iterate)**

```ts
import run from "@ayonli/jsext/run";

const job2 = await run<string, [string[]]>(
  "examples/worker.mjs",
  [["foo", "bar"]],
  { fn: "sequence" },
);
for await (const word of job2.iterate()) {
  console.log(word);
}
// output:
// foo
// bar
```

**Example (abort)**

```ts
import run from "@ayonli/jsext/run";
import _try from "@ayonli/jsext/try";

const job3 = await run<string, [string]>("examples/worker.mjs", ["foobar"], {
  fn: "takeTooLong",
});
await job3.abort();
const [err, res] = await _try(job3.result());
console.assert(err === null);
console.assert(res === undefined);
```

---

```ts
namespace run {
  /**
   * The maximum number of workers allowed to exist at the same time.
   * If not set, use the same setting as {@link parallel.maxWorkers}.
   */
  export var maxWorkers: number | undefined;
}
```

---

### example

```ts
declare function example<T, A extends any[] = any[]>(
  fn: (this: T, console: Console, ...args: A) => void | Promise<void>,
  options?: {
    /** Suppress logging to the terminal and only check the output. */
    suppress?: boolean;
  },
): (this: T, ...args: A) => Promise<void>;
```

Inspired by Golang's **Example as Test** design, creates a function that carries
example code with `// output:` comments, when the returned function is called,
it will automatically check if the actual output matches the one declared in the
comment.

The example function receives a customized `console` object which will be used
to log outputs instead of using the built-in `console`.

**NOTE:** This function is used to simplify the process of writing tests,
currently, it does not work in Bun, **tsx** and browsers, because Bun hasn't
implement the `Console` constructor and removes comments during runtime, **tsx**
also remove comments, and the function relies on Node.js built-in modules.

**Example**

```ts
import example from "@ayonli/jsext/example";

it(
  "should output as expected",
  example((console) => {
    console.log("Hello, World!");
    // output:
    // Hello, World!
  }),
);
```

---

### deprecate

```ts
declare function deprecate<T, Fn extends (this: T, ...args: any[]) => any>(
  fn: Fn,
  tip?: string,
  once?: boolean,
): Fn;
```

Marks a function as deprecated and returns a wrapped function.

When the wrapped function is called, a deprecation warning will be emitted to
the stdout.

**NOTE:** The original function must have a name.

**Example**

```ts
import deprecate from "@ayonli/jsext/deprecate";

const sum = deprecate(function sum(a: number, b: number) {
  return a + b;
}, "use `a + b` instead");
console.log(sum(1, 2));
// output:
// DeprecationWarning: sum() is deprecated, use `a + b` instead (at <anonymous>:4:13)
// 3
```

---

```ts
declare function deprecate(
  target: string,
  forFn: Function,
  tip?: string,
  once?: boolean,
): void;
```

Emits a deprecation warning for the target, usually a parameter, an option, or
the function's name, etc.

**Example**

```ts
import deprecate from "@ayonli/jsext/deprecate";

function pow(a: number, b: number) {
  deprecate("pow()", pow, "use `a ** b` instead");
  return a ** b;
}

console.log(pow(2, 3));
// output:
// DeprecationWarning: pow() is deprecated, use `a ** b` instead (at <anonymous>:5:13)
// 8
```

---

## Classes and Types

- `Channel<T>`
- `Queue<T>`
- `Mutex<T>`
  - `Lock<T>`
- `AsyncFunction`
- `AsyncGeneratorFunction`
- `AsyncFunctionConstructor`
- `Constructor<T>`
- `RealArrayLike<T>`
- `TypedArray`
- `Optional<T, K extends keyof T>`
- `Ensured<T, K extends keyof T>`

_When [augment](#augmentations)ing, these types are exposed to the global scope_
_(except for `Channel`, `Queue` and `Mutex`)._

## Sub-categories

Each of these modules includes specific functions for their target categories:

- [async](https://jsr.io/@ayonli/jsext/doc/async/~) Functions for async/promise
  context handling.
  - Historically, this module was named `promise`, but that name has been
    deprecated.
- [array](https://jsr.io/@ayonli/jsext/doc/array/~) Functions for dealing with
  arrays.
- [bytes](https://jsr.io/@ayonli/jsext/doc/bytes/~) Functions for dealing with
  byte arrays (`Uint8Array`).
  - Historically, this module was named `uint8array`, but that name has been
    deprecated.
- [class](https://jsr.io/@ayonli/jsext/doc/class/~) Functions for dealing with
  ES6 classes.
- [collections](https://jsr.io/@ayonli/jsext/doc/collections/~) Additional
  collection data types.
- [dialog](https://jsr.io/@ayonli/jsext/doc/dialog/~) (Experimental)
  Asynchronous dialog functions for both browsers and terminals.
- [error](https://jsr.io/@ayonli/jsext/doc/error/~) Functions for converting
  errors to/from other types of objects.
- [json](https://jsr.io/@ayonli/jsext/doc/json/~) Functions for parsing JSONs to
  specific structures.
- [math](https://jsr.io/@ayonli/jsext/doc/math/~) Functions for mathematical
  calculations.
- [number](https://jsr.io/@ayonli/jsext/doc/number/~) Functions for dealing with
  numbers.
- [object](https://jsr.io/@ayonli/jsext/doc/object/~) Functions for dealing with
  objects.
- [path](https://jsr.io/@ayonli/jsext/doc/path/~) (Experimental)
  Platform-independent utility functions for dealing with system paths and URLs.
- [string](https://jsr.io/@ayonli/jsext/doc/string/~) Functions for dealing with
  strings.

## Augmentations

Check [augment.md](./augment.md).
