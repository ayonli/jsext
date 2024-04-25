import './augment/string.js';
import './augment/number.js';
import './augment/array.js';
import './augment/uint8array.js';
import './augment/object.js';
import './augment/math.js';
import './augment/promise.js';
import './augment/collections.js';
import './augment/error.js';
import './augment/json.js';
import './augment/pipe.js';
import { AsyncFunction, AsyncGeneratorFunction } from './types.js';
import { customInspect } from './runtime.js';

/// <reference types="./lib.deno.d.ts" />
// @ts-ignore
globalThis["AsyncFunction"] = AsyncFunction;
// @ts-ignore
globalThis["AsyncGeneratorFunction"] = AsyncGeneratorFunction;
Object.defineProperty(Symbol, "customInspec", { value: customInspect });
//# sourceMappingURL=augment.js.map
