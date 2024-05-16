import { getMIME } from '../filetype.js';
import { extname } from '../path.js';

function fixFileType(file) {
    var _a;
    if (!file.type) {
        const ext = extname(file.name);
        if (ext) {
            Object.defineProperty(file, "type", {
                value: (_a = getMIME(ext)) !== null && _a !== void 0 ? _a : "",
                writable: false,
                configurable: true,
            });
        }
    }
    return file;
}

export { fixFileType };
//# sourceMappingURL=types.js.map
