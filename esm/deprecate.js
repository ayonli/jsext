import wrap from './wrap.js';

const isBun = typeof Bun === "object";
const warnedRecord = new Map();
function deprecate(target, ...args) {
    var _a, _b, _c, _d;
    if (typeof target === "function") {
        const tip = (_a = args[0]) !== null && _a !== void 0 ? _a : "";
        const once = (_b = args[1]) !== null && _b !== void 0 ? _b : false;
        return wrap(target, function wrapped(fn, ...args) {
            emitWarning(fn.name + "()", wrapped, tip, once, isBun ? 1 : 2);
            return fn.apply(this, args);
        });
    }
    const forFn = args[0];
    const tip = (_c = args[1]) !== null && _c !== void 0 ? _c : "";
    const once = (_d = args[2]) !== null && _d !== void 0 ? _d : false;
    return emitWarning(target, forFn, tip, once, 1);
}
function emitWarning(target, forFn, tip, once, lineNum) {
    var _a;
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
        if (offset !== -1) {
            lines = lines.slice(offset); // fix for tsx in Node.js v16
        }
        let line = (_a = lines[lineNum]) === null || _a === void 0 ? void 0 : _a.trim();
        let warning = `${target} is deprecated`;
        if (tip) {
            warning += ", " + tip;
        }
        if (line) {
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
