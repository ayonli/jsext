import { toObject, fromObject } from './index.js';
import Exception from './Exception.js';

//@ts-ignore
globalThis["Exception"] = Exception;
Error.toObject = toObject;
Error.fromObject = fromObject;
Error.prototype.toJSON = function toJSON() {
    return toObject(this);
};
//# sourceMappingURL=augment.js.map
