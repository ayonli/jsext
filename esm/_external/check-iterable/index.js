import { __exports as checkIterable } from '../../_virtual/index.js';

Object.defineProperty(checkIterable, "__esModule", {
  value: true
});
checkIterable.isIterable = isIterable;
checkIterable.isAsyncIterable = isAsyncIterable;
checkIterable.isIteratorLike = isIteratorLike;
checkIterable.isIterableIterator = isIterableIterator;
checkIterable.isAsyncIterableIterator = isAsyncIterableIterator;
var isGenerator_1 = checkIterable.isGenerator = isGenerator;
var isAsyncGenerator_1 = checkIterable.isAsyncGenerator = isAsyncGenerator;
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
if (!Symbol.asyncIterator) {
  Symbol.asyncIterator = Symbol("Symbol.asyncIterator");
}

/**
 * Checks if the given object is an Iterable (implemented `@@iterator`).
 * @returns {obj is Iterable<any>}
 */
function isIterable(obj) {
  return obj !== null && obj !== undefined && typeof obj[Symbol.iterator] === "function";
}

/**
 * Checks if the given object is an AsyncIterable (implemented `@@asyncIterator`).
 * @returns {obj is AsyncIterable<any>}
 */
function isAsyncIterable(obj) {
  return obj !== null && obj !== undefined && typeof obj[Symbol.asyncIterator] === "function";
}

/**
 * Checks if the given object is an IteratorLike (implemented `next`).
 * @returns {obj is { next: Function }}
 */
function isIteratorLike(obj) {
  // An iterable object has a 'next' method, however including a 'next' method
  // doesn't ensure the object is an iterator, it is only iterator-like.
  return _typeof(obj) === "object" && obj !== null && typeof obj.next === "function";
}

/**
 * Checks if the given object is an IterableIterator (implemented both
 * `@@iterator` and `next`).
 */
function isIterableIterator(obj) {
  return isIteratorLike(obj) && typeof obj[Symbol.iterator] === "function";
}

/**
 * Checks if the given object is an AsyncIterableIterator (implemented
 * both `@@asyncIterator` and `next`).
 * @returns {obj is AsyncIterableIterator<any>}
 */
function isAsyncIterableIterator(obj) {
  return isIteratorLike(obj) && typeof obj[Symbol.asyncIterator] === "function";
}

/**
 * Checks if the given object is a Generator.
 * @returns {obj is Generator}
 */
function isGenerator(obj) {
  return isIterableIterator(obj) && hasGeneratorSpecials(obj);
}

/**
 * Checks if the given object is an AsyncGenerator.
 * @returns {obj is AsyncGenerator}
 */
function isAsyncGenerator(obj) {
  return isAsyncIterableIterator(obj) && hasGeneratorSpecials(obj);
}
function hasGeneratorSpecials(obj) {
  return typeof obj["return"] === "function" && typeof obj["throw"] === "function";
}

export { checkIterable as default, isAsyncGenerator_1 as isAsyncGenerator, isGenerator_1 as isGenerator };
//# sourceMappingURL=index.js.map
