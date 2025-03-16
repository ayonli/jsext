import { toObject, fromObject, toErrorEvent, fromErrorEvent, isCausedBy } from '../error.js';
import Exception from '../error/Exception.js';
import { NotAllowedError, NotFoundError, AlreadyExistsError, NotSupportedError, NotImplementedError, TimeoutError, NetworkError } from '../error/common.js';

//@ts-ignore
globalThis["Exception"] = Exception;
//@ts-ignore
globalThis["NotAllowedError"] = NotAllowedError;
//@ts-ignore
globalThis["NotFoundError"] = NotFoundError;
//@ts-ignore
globalThis["AlreadyExistsError"] = AlreadyExistsError;
//@ts-ignore
globalThis["NotSupportedError"] = NotSupportedError;
//@ts-ignore
globalThis["NotImplementedError"] = NotImplementedError;
//@ts-ignore
globalThis["TimeoutError"] = TimeoutError;
//@ts-ignore
globalThis["NetworkError"] = NetworkError;
Error.toObject = toObject;
Error.fromObject = fromObject;
Error.toErrorEvent = toErrorEvent;
Error.fromErrorEvent = fromErrorEvent;
Error.prototype.toJSON = function toJSON() {
    return toObject(this);
};
Error.prototype.isCausedBy = function isCausedBy$1(cause) {
    return isCausedBy(this, cause);
};
//# sourceMappingURL=error.js.map
