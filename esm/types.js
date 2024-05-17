/**
 * The missing utility types for TypeScript.
 * @module
 */
/** This is the very constructor/class of all async functions. */
const AsyncFunction = (async function () { }).constructor;
/** This is the very constructor/class of all generator functions. */
const GeneratorFunction = (function* () { }).constructor;
/** This is the very constructor/class of all async generator functions. */
const AsyncGeneratorFunction = (async function* () { }).constructor;
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
 */
const TypedArray = Object.getPrototypeOf(Uint8Array);

export { AsyncFunction, AsyncGeneratorFunction, GeneratorFunction, TypedArray };
//# sourceMappingURL=types.js.map
