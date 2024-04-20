/**
 * The missing utility types for TypeScript.
 * @module
 */
/** This is the very constructor/class of all async functions. */
const AsyncFunction = (async function () { }).constructor;
/** This is the very constructor/class of all async generator functions. */
const AsyncGeneratorFunction = (async function* () { }).constructor;

export { AsyncFunction, AsyncGeneratorFunction };
//# sourceMappingURL=types.js.map
