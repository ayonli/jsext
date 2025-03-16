export { default as Tarball } from '../archive/Tarball.js';
import { throwUnsupportedRuntimeError } from '../error.js';
export { CorruptedArchiveError, FilenameTooLongError } from '../archive/errors.js';

async function tar(src, dest = {}, options = {}) {
    throwUnsupportedRuntimeError();
}
async function untar(src, dest = {}, options = {}) {
    throwUnsupportedRuntimeError();
}

export { tar, untar };
//# sourceMappingURL=archive.js.map
