import { NetworkError } from "../error.ts";
import { isUrl } from "../path.ts";

const urlCache = new Map<string, string>();

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
export async function getObjectURL(
    src: string,
    mimeType: string = "text/javascript"
): Promise<string> {
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

    let blob: Blob;

    // JavaScript has more than one MIME types, so we just check it loosely.
    const type = mimeType.includes("javascript") ? "javascript" : mimeType;

    if (res.headers.get("content-type")?.includes(type)) {
        blob = await res.blob();
    } else {
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
