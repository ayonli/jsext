import { isAsyncGenerator, isGenerator } from './external/check-iterable/index.js';

// @ts-ignore
function _try(fn, ...args) {
    if (isFunction(fn)) {
        try {
            return _try(fn.apply(void 0, args));
        }
        catch (err) {
            return [err, undefined];
        }
    }
    let returns = fn;
    // Implementation details should be ordered from complex to simple.
    if (isAsyncGenerator(returns)) {
        return (async function* () {
            let input;
            let result;
            // Use `while` loop instead of `for...of...` in order to
            // retrieve the return value of a generator function.
            while (true) {
                try {
                    const { done, value } = await returns.next(input);
                    if (done) {
                        result = value;
                        break;
                    }
                    else {
                        // Receive any potential input value that passed
                        // to the outer `next()` call, and pass them to
                        // `res.next()` in the next call.
                        input = yield Promise.resolve([null, value]);
                    }
                }
                catch (err) {
                    // If any error occurs, yield that error as resolved
                    // and break the loop immediately, indicating the
                    // process is forced broken.
                    yield Promise.resolve([err, undefined]);
                    break;
                }
            }
            return [null, result];
        })();
    }
    else if (isGenerator(returns)) {
        return (function* () {
            let input;
            let result;
            while (true) {
                try {
                    const { done, value } = returns.next(input);
                    if (done) {
                        result = value;
                        break;
                    }
                    else {
                        input = yield [null, value];
                    }
                }
                catch (err) {
                    yield [err, undefined];
                    break;
                }
            }
            return [null, result];
        })();
    }
    else if (isFunction(returns === null || returns === void 0 ? void 0 : returns.then)) {
        returns = returns.then((value) => [null, value]);
        return Promise.resolve(returns).catch((err) => [err, undefined]);
    }
    else {
        return [null, returns];
    }
}
function isFunction(val) {
    return typeof val === "function";
}

export { _try as default, isFunction };
//# sourceMappingURL=try.js.map
