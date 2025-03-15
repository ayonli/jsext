import '../bytes.js';
import '../error/Exception.js';
import '../external/event-target-polyfill/index.js';
import { NotImplementedError } from '../error/common.js';

async function alert(message, options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function confirm(message, options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function prompt(message, options = "") {
    throw new NotImplementedError("Unsupported runtime");
}
async function progress(message, fn, onAbort = undefined) {
    throw new NotImplementedError("Unsupported runtime");
}
async function pickFile(options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function pickFiles(options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function pickDirectory(options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
function openFile(options) {
    throw new NotImplementedError("Unsupported runtime");
}
async function openFiles(options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function openDirectory(options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function saveFile(file, options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function downloadFile(url, options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}

export { alert, confirm, downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, progress, prompt, saveFile };
//# sourceMappingURL=dialog.js.map
