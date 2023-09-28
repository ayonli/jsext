import './string/augment.js';
import './number/augment.js';
import './array/augment.js';
import './uint8array/augment.js';
import './object/augment.js';
import './math/augment.js';
import './promise/augment.js';
import './collections/augment.js';
import './error/augment.js';
import './json/augment.js';
import { AsyncFunction, AsyncGeneratorFunction } from './index.js';

// @ts-ignore
globalThis["AsyncFunction"] = AsyncFunction;
// @ts-ignore
globalThis["AsyncGeneratorFunction"] = AsyncGeneratorFunction;
//# sourceMappingURL=augment.js.map
