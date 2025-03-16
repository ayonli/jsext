export { FilenameTooLongError, default as Tarball } from '../archive/Tarball.js';
import '../bytes.js';
import '../error/Exception.js';
import '../external/event-target-polyfill/index.js';
import { NotImplementedError } from '../error/common.js';

async function tar(src, dest = {}, options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function untar(src, dest = {}, options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}

export { tar, untar };
//# sourceMappingURL=archive.js.map
