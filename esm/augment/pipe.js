import { Pipeline } from '../pipe.js';

function pipe(fn, ...args) {
    return new Pipeline(this instanceof Date ? this : this.valueOf()).pipe(fn, ...args);
}
String.prototype.pipe = pipe;
Number.prototype.pipe = pipe;
BigInt.prototype.pipe = pipe;
Boolean.prototype.pipe = pipe;
Array.prototype.pipe = pipe;
Map.prototype.pipe = pipe;
Set.prototype.pipe = pipe;
Error.prototype.pipe = pipe;
Date.prototype.pipe = pipe;
//# sourceMappingURL=pipe.js.map
