# JsExt

A JavaScript extension package for building strong and modern applications.

This package is built on top of modern web standards and provides universal
high-level APIs that can work across different runtime environments, whether
it's Node.js, Deno, Bun, Cloudflare Workers, browsers, Windows, macOS or Linux.

## Outstanding Features

- [x] Various useful functions for built-in data types that are not built-in.
- [x] Various utility functions to extend the ability of flow control.
- [x] Multi-threaded JavaScript with parallel threads.
- [x] File system APIs for both server and browser environments.
- [x] Open dialogs in both CLI and web applications.
- [x] Manipulate file system paths and URLs in the same way.
- [x] Handle byte arrays and readable streams effortlessly.
- [x] Create, extract and preview archives in all runtimes.
- [x] And many more...

## Import

The recommended way is to only import the ones that are needed:

```js
// Universal
import _try from "@ayonli/jsext/try";
import func from "@ayonli/jsext/func";
// ...

// Deno (URL)
import _try from "https://lib.deno.dev/x/ayonli_jsext@latest/try.ts";
import func from "https://lib.deno.dev/x/ayonli_jsext@latest/func.ts";
// ...

// Browsers (URL)
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

## Top-Level Functions

- [_try](#_try) Calls a function safely and return errors when captured.
- [func](#func) Declares a function along with a `defer` keyword, inspired by
  Golang.
- [wrap](#wrap) Wraps a function for decorator pattern but keep its signature.
- [mixin](#mixin) Declares a class that combines all methods from the base
  classes.
- [throttle](#throttle) Throttles function calls for frequent access.
- [debounce](#debounce) Debounces function calls for frequent access.
- [queue](#queue) Handles tasks sequentially and prevent concurrency conflicts.
- [lock](#lock) Provides mutual exclusion for concurrent operations.
- [chan](#chan) Creates a channel that transfers data across routines, even
  across multiple threads, inspired by Golang.
- [parallel](#parallel) Runs functions in parallel threads and take advantage of
  multi-core CPUs, inspired by Golang.
- [run](#run) Runs a script in another thread and abort at any time.
- [deprecate](#deprecate) Marks a function as deprecated and emit warnings when
  it is called.
- [pipe](#pipe) Performs pipe operations through a series of functions upon a
  value.

## Subcategories

Each of these modules includes specific functions and classes for their target
categories:

- [archive](https://jsr.io/@ayonli/jsext/doc/archive/~) (Experimental) Collecting
  files into an archive file, or extracting files from a archive file.
- [array](https://jsr.io/@ayonli/jsext/doc/array/~) Functions for dealing with
  arrays.
- [async](https://jsr.io/@ayonli/jsext/doc/async/~) Functions for async/promise
  context handling.
  - Historically, this module was named `promise`, but that name has been
    deprecated.
- [bytes](https://jsr.io/@ayonli/jsext/doc/bytes/~) Functions for dealing with
  byte arrays (`Uint8Array`).
  - Historically, this module was named `uint8array`, but that name has been
    deprecated.
- [class](https://jsr.io/@ayonli/jsext/doc/class/~) Functions for dealing with
  classes.
- [cli](https://jsr.io/@ayonli/jsext/doc/cli/~) (Experimental) Useful utility
  functions for interacting with the terminal.
- [collections](https://jsr.io/@ayonli/jsext/doc/collections/~) Additional
  collection data types.
- [dialog](https://jsr.io/@ayonli/jsext/doc/dialog/~) (Experimental)
  Asynchronous dialog functions for both browsers and terminals.
- [encoding](https://jsr.io/@ayonli/jsext/doc/encoding/~) Utilities for encoding
  and decoding binary representations like hex and base64 strings.
- [error](https://jsr.io/@ayonli/jsext/doc/error/~) Functions for converting
  errors to/from other types of objects.
- [event](https://jsr.io/@ayonli/jsext/doc/event/~) Functions for working with
  events.
- [filetype](https://jsr.io/@ayonli/jsext/doc/filetype/~) Functions to get file
  types in different fashions.
- [fs](https://jsr.io/@ayonli/jsext/doc/fs/~) (Experimental) Universal file
  system APIs for both server and browser applications.
- [hash](https://jsr.io/@ayonli/jsext/doc/hash/~) Simplified hash functions for
  various data types.
- [http](https://jsr.io/@ayonli/jsext/doc/http/~) (Experimental) Utility
  functions for handling HTTP related tasks, such as parsing headers.
- [json](https://jsr.io/@ayonli/jsext/doc/json/~) Functions for parsing JSONs to
  specific structures.
- [math](https://jsr.io/@ayonli/jsext/doc/math/~) Functions for mathematical
  calculations.
- [module](https://jsr.io/@ayonli/jsext/doc/module/~) Utility functions for
  working with JavaScript modules.
- [number](https://jsr.io/@ayonli/jsext/doc/number/~) Functions for dealing with
  numbers.
- [object](https://jsr.io/@ayonli/jsext/doc/object/~) Functions for dealing with
  objects.
- [path](https://jsr.io/@ayonli/jsext/doc/path/~) (Experimental)
  Platform-independent utility functions for dealing with file system paths and
  URLs.
- [reader](https://jsr.io/@ayonli/jsext/doc/reader/~) Utility functions for
  reading data from various types of source into various forms.
  - Historically, there was a `read` module and a `realAll` module, but they
    have been merged into this module as the `toAsyncIterable` function and the
    `readAsArray` function.
- [runtime](https://jsr.io/@ayonli/jsext/doc/runtime/~) Utility functions to
  retrieve runtime information or modify runtime behaviors.
- [sse](https://jsr.io/@ayonli/jsext/doc/sse/~) (Experimental) Tools for
  processing Server-sent Events requests and handling message events.
- [string](https://jsr.io/@ayonli/jsext/doc/string/~) Functions for dealing with
  strings.
- [types](https://jsr.io/@ayonli/jsext/doc/types/~) The missing builtin classes
  of JavaScript and utility types for TypeScript.
- [ws](https://jsr.io/@ayonli/jsext/doc/ws/~) (Experimental) A universal
  WebSocket server interface for Node.js, Deno, Bun and Cloudflare Workers.

## Augmentation

This package supports augmenting some functions to the corresponding built-in
types/namespaces, but they should only be used for application development,
don't use them when developing libraries.

_NOTE: this feature is only available by the NPM package, they don't work by_
_the JSR package._

For more details, please check
[this document](https://github.com/ayonli/jsext/blob/main/augment/README.md).

## Note for Cloudflare Workers

For applications run in Cloudflare Workers, install the NPM version of this
package instead of the JSR version.

## API References

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
import { range } from "@ayonli/jsext/number";

const iter = range(1, 10);

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

### mixin

```ts
import { Constructor } from "@ayonli/jsext";
import { UnionToIntersection } from "@ayonli/jsext/mixin";

declare function mixin<T extends Constructor<any>, M extends any[]>(
  base: T,
  ...mixins: { [X in keyof M]: Constructor<M[X]> }
): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;
declare function mixin<T extends Constructor<any>, M extends any[]>(
  base: T,
  ...mixins: M
): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;
```

Creates a class that combines all methods from the given base class and mixin
classes.

**Example**

```ts
import mixin from "@ayonli/jsext/mixin";
import { isSubclassOf } from "@ayonli/jsext/class";

class Log {
  log(text: string) {
    console.log(text);
  }
}

class View {
  display(data: Record<string, any>[]) {
    console.table(data);
  }
}

class Controller extends mixin(View, Log) {
  constructor(readonly topic: string) {
    super();
  }
}

const ctrl = new Controller("foo");
ctrl.log("something is happening");
ctrl.display([{ topic: ctrl.topic, content: "something is happening" }]);

console.assert(isSubclassOf(Controller, View));
console.assert(!isSubclassOf(Controller, Log));
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
import { sleep } from "@ayonli/jsext/async";

const fn = throttle((input: string) => input, 1_000);
console.log(fn("foo")); // foo
console.log(fn("bar")); // foo

await sleep(1_000);
console.log(fn("bar")); // bar
```

**Example (with key)**

```ts
import throttle from "@ayonli/jsext/throttle";
import { sleep } from "@ayonli/jsext/async";

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
import { sleep } from "@ayonli/jsext/async";

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

const key = "unique_key";

export function concurrentOperation() {
  using ctx = await lock(key);
  void ctx;

  // This block will never be run if there are other coroutines holding
  // the lock.
  //
  // Other coroutines trying to lock the same key will also never be run
  // before this function completes.
}
```

Other than using the `lock()` function, we can also use `new Mutex()` to create
a mutex instance that holds some shared resource which can only be accessed by
one coroutine at a time.

**Example**

```ts
import { Mutex } from "@ayonli/jsext/lock";
import { random } from "@ayonli/jsext/number";
import { sleep } from "@ayonli/jsext/async";

const mutex = new Mutex(1);

async function concurrentOperation() {
  using shared = await mutex.lock();
  const value1 = shared.value;

  await otherAsyncOperations();

  shared.value += 1;
  const value2 = shared.value;

  // Without mutex lock, the shared value may have been modified by other
  // calls during `await otherAsyncOperation()`, and the following
  // assertion will fail.
  console.assert(value1 + 1 === value2);
}

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
import { range } from "@ayonli/jsext/number";

const channel = chan<number>();

(async () => {
  for (const num of range(1, 5)) {
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
const { greet } = parallel(() => import("./examples/worker.mjs"));

console.log(await greet("World")); // Hi, World
```

**Example (generator or async generator function)**

```ts
import parallel from "@ayonli/jsext/parallel";
const { sequence } = parallel(() => import("./examples/worker.mjs"));

for await (const word of sequence(["foo", "bar"])) {
  console.log(word);
}
// output:
// foo
// bar
```

**Example (use channel)**

```ts
import chan from "@ayonli/jsext/chan";
import { range } from "@ayonli/jsext/number";
import readAll from "@ayonli/jsext/readAll";
import parallel from "@ayonli/jsext/parallel";
const { twoTimesValues } = parallel(() => import("./examples/worker.mjs"));

const channel = chan<{ value: number; done: boolean }>();
const length = twoTimesValues(channel);

for (const value of range(0, 9)) {
  await channel.send({ value, done: value === 9 });
}

const results = (await readAll(channel)).map((item) => item.value);
console.log(results); // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
console.log(await length); // 10
```

**Example (use transferrable)**

```ts
import parallel from "@ayonli/jsext/parallel";
const { transfer } = parallel(() => import("./examples/worker.mjs"));

const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const length = await transfer(arr.buffer);

console.log(length); // 10
console.log(arr.length); // 0
```

**Use with Vite:**

In order to use parallel threads with Vite, we need to adjust a little bit,
please check
[this document](https://github.com/ayonli/jsext/blob/main/parallel/README.md#use-with-vite).

**Compatibility List:**

The following environments are guaranteed to work:

- [x] Node.js v12+
- [x] Deno v1.0+
- [x] Bun v1.0+
- [x] Modern browsers

The following environments are not supported:

- [ ] Cloudflare Workers
- [ ] Fastly Compute
- [ ] WinterJS
- [ ] Any other runtime that doesn't support the `Worker` constructor

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

  /**
   * Indicates whether the current thread is the main thread.
   */
  export const isMainThread: boolean;
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
  /**
   * Terminates the worker thread and aborts the task. If `reason` is provided,
   * `result()` or `iterate()` will throw the error. Otherwise, the task will
   * be aborted silently.
   */
  abort(reason?: Error | null): Promise<void>;
}>;
```

Runs the given `script` in a worker thread and abort the task at any time.

This function is similar to `parallel()`, many features and restrictions
applicable to `parallel()` are also applicable to `run()`, except the following:

1. The `script` can only be a filename, and is relative to the current working
   directory (or the current URL) if not absolute.
2. Only one task is allow to run at a time for one worker thread, set
   `run.maxWorkers` to allow more tasks to be run at the same time if needed.
3. By default, the worker thread is dropped after the task settles, set
   `keepAlive` option in order to reuse it.
4. This function is not intended to be used in the browser, because it takes a
   bare filename as argument, which will not be transformed to a proper URL if
   the program is to be bundled.

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

### pipe

```ts
import { Pipeline } from "@ayonli/jsext/pipe";

declare function pipe<T>(value: T): Pipeline<T>;
```

Constructs a `Pipeline` instance with the given value and performs pipe
operations upon it.

**Example**

```ts
import pipe from "@ayonli/jsext/pipe";

const { value } = pipe("10")
  .pipe(parseInt)
  .pipe(Math.pow, 2)
  .pipe((v) => v.toFixed(2));

console.log(`the value is ${value}`); // the value is 100.00
```
