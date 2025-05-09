import '../error.js';
import '../path.js';
import { isUrl } from '../path/util.js';
import { NetworkError } from '../error/common.js';

const urlCache = new Map();
/**
 * This function is primarily used to bypass the same-origin policy for Web
 * Workers in the browser, it downloads the script from the given URL and
 * converts it to an object URL which can be used by the `Worker` constructor.
 *
 * This function can also be used in other scenarios as it also corrects the
 * content-type of the response to ensure the script can be loaded properly.
 *
 * NOTE: This function is primarily designed for the browser, it has very little
 * use on the server side.
 */
async function getObjectURL(src, mimeType = "text/javascript") {
    var _a;
    const isAbsolute = isUrl(src);
    let cache = isAbsolute ? urlCache.get(src) : undefined;
    if (cache) {
        return cache;
    }
    // Use fetch to download the script and compose an object URL which can
    // bypass the same-origin policy for web workers.
    const res = await fetch(src);
    if (!res.ok) {
        throw new NetworkError(`Failed to fetch resource: ${src}`);
    }
    let blob;
    // JavaScript has more than one MIME types, so we just check it loosely.
    const type = mimeType.includes("javascript") ? "javascript" : mimeType;
    if ((_a = res.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.includes(type)) {
        blob = await res.blob();
    }
    else {
        // If the MIME type is not matched, we need to convert the response to
        // a new Blob with the correct MIME type.
        const buf = await res.arrayBuffer();
        blob = new Blob([new Uint8Array(buf)], {
            type: mimeType,
        });
    }
    cache = URL.createObjectURL(blob);
    isAbsolute && urlCache.set(src, cache);
    return cache;
}

export { getObjectURL };
//# sourceMappingURL=util.js.map
