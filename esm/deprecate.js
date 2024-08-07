import runtime from './runtime.js';
import wrap from './wrap.js';

/**
 * Marks a function as deprecated and emit warnings when it is called.
 * @module
 * @experimental
 */
const warnedRecord = new Map();
function deprecate(target, ...args) {
    var _a, _b, _c, _d;
    const { identity } = runtime();
    if (typeof target === "function") {
        const tip = (_a = args[0]) !== null && _a !== void 0 ? _a : "";
        const once = (_b = args[1]) !== null && _b !== void 0 ? _b : false;
        return wrap(target, function wrapped(fn, ...args) {
            const lineOffset = ({
                "node": 2,
                "deno": 2,
                "chrome": 2,
                "workerd": 2,
                "bun": 1,
                "safari": 1,
                "firefox": 3,
                "fastly": 3,
                "unknown": 3,
            })[identity];
            emitWarning(fn.name + "()", wrapped, tip, once, lineOffset, identity, true);
            return fn.apply(this, args);
        });
    }
    const forFn = args[0];
    const tip = (_c = args[1]) !== null && _c !== void 0 ? _c : "";
    const once = (_d = args[2]) !== null && _d !== void 0 ? _d : false;
    const lineOffset = ({
        "node": 1,
        "deno": 1,
        "chrome": 1,
        "workerd": 1,
        "bun": 1,
        "safari": 1,
        "firefox": 3,
        "fastly": 3,
        "unknown": 3,
    })[identity];
    return emitWarning(target, forFn, tip, once, lineOffset, identity, false);
}
function emitWarning(target, forFn, tip, once, lineNum, runtime, wrapped = false) {
    if (!once || !warnedRecord.has(forFn)) {
        let trace = {};
        if (typeof Error.captureStackTrace === "function") {
            Error.captureStackTrace(trace, forFn);
        }
        else {
            trace = new Error("");
        }
        let lines = trace.stack.split("\n");
        const offset = lines.findIndex(line => line === "Error");
        if (offset !== -1 && offset !== 0) {
            lines = lines.slice(offset); // fix for tsx in Node.js v16
        }
        let line;
        if (runtime === "safari") {
            line = lines.find(line => line.trim().startsWith("module code@"))
                || lines[lineNum];
        }
        else if (runtime === "bun" && !wrapped) {
            line = lines.find(line => line.trim().startsWith("at module code"))
                || lines[lineNum];
        }
        else {
            line = lines[lineNum];
        }
        let warning = `${target} is deprecated`;
        if (tip) {
            warning += ", " + tip;
        }
        if (line) {
            line = line.trim();
            let start = line.indexOf("(");
            if (start !== -1) {
                start += 1;
                const end = line.indexOf(")", start);
                line = line.slice(start, end);
            }
            warning += " (" + line + ")";
        }
        console.warn("DeprecationWarning:", warning);
        once && warnedRecord.set(forFn, true);
    }
}

export { deprecate as default };
//# sourceMappingURL=deprecate.js.map
