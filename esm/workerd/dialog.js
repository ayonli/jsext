import { throwUnsupportedRuntimeError } from '../error.js';

async function alert(message, options = {}) {
    throwUnsupportedRuntimeError();
}
async function confirm(message, options = {}) {
    throwUnsupportedRuntimeError();
}
async function prompt(message, options = "") {
    throwUnsupportedRuntimeError();
}
async function progress(message, fn, onAbort = undefined) {
    throwUnsupportedRuntimeError();
}
async function pickFile(options = {}) {
    throwUnsupportedRuntimeError();
}
async function pickFiles(options = {}) {
    throwUnsupportedRuntimeError();
}
async function pickDirectory(options = {}) {
    throwUnsupportedRuntimeError();
}
function openFile(options) {
    throwUnsupportedRuntimeError();
}
async function openFiles(options = {}) {
    throwUnsupportedRuntimeError();
}
async function openDirectory(options = {}) {
    throwUnsupportedRuntimeError();
}
async function saveFile(file, options = {}) {
    throwUnsupportedRuntimeError();
}
async function downloadFile(url, options = {}) {
    throwUnsupportedRuntimeError();
}

export { alert, confirm, downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, progress, prompt, saveFile };
//# sourceMappingURL=dialog.js.map
