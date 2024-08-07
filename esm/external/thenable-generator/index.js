if (!Symbol.asyncIterator) {
    Object.defineProperty(Symbol, "asyncIterator", {
        value: Symbol("Symbol.asyncIterator")
    });
}
const source = Symbol("GeneratorSource");
const status = Symbol("GeneratorStatus");
const result = Symbol("GeneratorResult");
class Thenable {
    constructor(_source) {
        this[source] = _source;
        this[status] = "suspended";
        this[result] = void 0;
    }
    then(onfulfilled, onrejected) {
        let res;
        if (this[source] === undefined || this[status] === "closed") {
            res = Promise.resolve(this[result]);
        }
        else if (this[status] === "erred") {
            res = Promise.reject(this[source]);
        }
        else if (typeof this[source].then === "function") {
            res = Promise.resolve(this[source]);
        }
        else if (typeof this[source].next === "function") {
            res = processIterator(this[source]);
        }
        else {
            res = Promise.resolve(this[source]);
        }
        this[status] = "closed";
        return res
            .then(value => (this[result] = value))
            .then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return Promise.resolve(this).then(null, onrejected);
    }
}
class ThenableGenerator extends Thenable {
    next(...args) {
        const value = args[0];
        let res;
        if (this[source] === undefined || this[status] === "closed") {
            res = { value: void 0, done: true };
        }
        else if (this[status] === "erred") {
            return this.throw(this[source]);
        }
        else if (typeof this[source].next === "function") {
            res = this[source].next(value);
        }
        else {
            res = { value: this[source], done: true };
        }
        if (res.done === true) {
            this[status] = "closed";
            this[result] = res.value;
        }
        return res;
    }
    return(value) {
        this[status] = "closed";
        this[result] = value;
        if (this[source] && typeof this[source].return === "function") {
            return this[source].return(value);
        }
        else {
            return { value, done: true };
        }
    }
    throw(err) {
        this[status] = "closed";
        if (this[source] && typeof this[source].throw === "function") {
            return this[source].throw(err);
        }
        else {
            throw err;
        }
    }
    [Symbol.iterator]() {
        return this;
    }
    ;
}
class ThenableAsyncGenerator extends Thenable {
    next(...args) {
        const value = args[0];
        let res;
        if (this[source] === undefined || this[status] === "closed") {
            res = Promise.resolve({ value: void 0, done: true });
        }
        else if (typeof this[source].next === "function") {
            res = Promise.resolve(this[source].next(value));
        }
        else {
            res = Promise.resolve(this[source]).then(value => {
                return { value, done: true };
            });
        }
        return res.then(res => {
            if (res.done === true) {
                this[status] = "closed";
                this[result] = res.value;
            }
            return res;
        });
    }
    return(value) {
        this[status] = "closed";
        // The input value may be a promise-like object, using Promise.resolve()
        // to guarantee the value is resolved.
        return Promise.resolve(value).then(value => {
            this[result] = value;
            if (this[source] && typeof this[source].return === "function") {
                return Promise.resolve(this[source].return(value));
            }
            else {
                return Promise.resolve({ value, done: true });
            }
        });
    }
    throw(err) {
        this[status] = "closed";
        if (this[source] && typeof this[source].throw === "function") {
            return Promise.resolve(this[source].throw(err));
        }
        else {
            return Promise.reject(err);
        }
    }
    [Symbol.asyncIterator]() {
        return this;
    }
}
const ThenableGeneratorFunction = (function (fn) {
    if (!(this instanceof ThenableGeneratorFunction)) {
        return new ThenableGeneratorFunction(fn);
    }
    function anonymous(...args) {
        try {
            const source = fn.apply(this, args);
            if (typeof source.then === "function" || isAsyncGenerator(source)) {
                return new ThenableAsyncGenerator(source);
            }
            else {
                return new ThenableGenerator(source);
            }
        }
        catch (err) {
            return Object.assign(new ThenableGenerator(err), {
                [status]: "erred"
            });
        }
    }
    // HACK, let the returning function be an instance of
    // ThenableGeneratorFunction.
    anonymous.prototype = ThenableGeneratorFunction;
    anonymous.__proto__ = this;
    return anonymous;
});
Object.setPrototypeOf(ThenableGeneratorFunction, Function);
Object.setPrototypeOf(ThenableGeneratorFunction.prototype, Function.prototype);
function create(fn) {
    return new ThenableGeneratorFunction(fn);
}
ThenableGeneratorFunction.create = create;
function isAsyncGenerator(obj) {
    return obj !== null
        && typeof obj === "object"
        && typeof obj.next === "function"
        && typeof obj.return === "function"
        && typeof obj.throw === "function"
        && typeof obj[Symbol.asyncIterator] === "function";
}
function processIterator(iterator) {
    return new Promise((resolve, reject) => {
        function fulfilled(value) {
            try {
                step(iterator.next(value));
            }
            catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            var _a;
            try {
                step((_a = iterator.throw) === null || _a === void 0 ? void 0 : _a.call(iterator, value));
            }
            catch (e) {
                reject(e);
            }
        }
        function step(item) {
            Promise.resolve(item).then(result => {
                result.done ? resolve(result.value) : new Promise(resolve => {
                    resolve(result.value);
                }).then(fulfilled, rejected);
            });
        }
        step(iterator.next());
    });
}

export { Thenable, ThenableAsyncGenerator, ThenableGenerator, ThenableGeneratorFunction, create, create as default, result, source, status };
//# sourceMappingURL=index.js.map
