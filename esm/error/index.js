import { omit } from '../object/index.js';
import Exception from './Exception.js';

/** Transform the error to a plain object. */
function toObject(err) {
    return omit(err, ["toString", "toJSON"]);
}
function fromObject(obj) {
    var _a;
    // @ts-ignore
    if (!(obj === null || obj === void 0 ? void 0 : obj.name)) {
        return null;
    }
    // @ts-ignore
    let ctor = globalThis[obj.name];
    if (!ctor) {
        if (obj["name"] === "Exception") {
            ctor = Exception;
        }
        else {
            ctor = Error;
        }
    }
    const err = Object.create(ctor.prototype, {
        message: {
            configurable: true,
            enumerable: false,
            writable: true,
            value: (_a = obj["message"]) !== null && _a !== void 0 ? _a : "",
        },
    });
    if (err.name !== obj["name"]) {
        Object.defineProperty(err, "name", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["name"],
        });
    }
    if (obj["stack"] !== undefined) {
        Object.defineProperty(err, "stack", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["stack"],
        });
    }
    if (obj["cause"] != undefined) {
        Object.defineProperty(err, "cause", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["cause"],
        });
    }
    const otherKeys = Reflect.ownKeys(obj).filter(key => !["name", "message", "stack", "cause"].includes(key));
    otherKeys.forEach(key => {
        // @ts-ignore
        err[key] = obj[key];
    });
    return err;
}

export { Exception, fromObject, toObject };
//# sourceMappingURL=index.js.map
