/**
 * Utility functions for dealing with URLs.
 * @module
 * @experimental
 */

import { URLPrefix, isFileProtocol } from "./util.ts";

/**
 * Checks if the given string is a URL, whether standard or non-standard.
 * @experimental
 */
export function isUrl(str: string): boolean {
    return /^[a-z](([a-z\-]+)?:\/\/\S+|[a-z\-]+:\/\/$)/i.test(str) || isFileUrl(str);
}

/**
 * Checks if the given string is a file URL, whether with or without `//`.
 * @experimental
 */
export function isFileUrl(str: string): boolean {
    return /^file:((\/\/|\/)\S+|\/?$)/i.test(str);
}

/**
 * Parses the given string as a `URL` object, whether standard or non-standard.
 * @experimental
 */
export function parse(str: string, base: string | URL | undefined = undefined): URL {
    let match = str.match(URLPrefix);
    let prefix: string;
    let rest: string;

    if (match) {
        prefix = match[0];
        rest = str.slice(prefix.length);
    } else if (!match) {
        if (base) {
            base = typeof base === "string" ? parse(base) : base;
            const { protocol, host, pathname } = base;
            prefix = protocol + "//";
            rest = new URL(str, "http://" + (host || "localhost") + pathname).href;

            if (host) {
                rest = rest.slice(7);
            } else {
                rest = rest.slice(7 + 9);
            }
        } else {
            throw new TypeError(`Invalid URL: '${str}'`);
        }
    }

    const isFileUrl = isFileProtocol(prefix!);
    const isFileUrlWithHost = isFileUrl && rest!.length > 0 && rest![0] !== "/";

    if (isFileUrl && !prefix!.endsWith("//")) {
        prefix = prefix! + "//";
    }

    if (isFileUrl && !isFileUrlWithHost) {
        rest = "localhost" + rest!;
    }

    const urlObj = new URL("http://" + rest!);
    const protocol = prefix!.slice(0, -2);
    const hostname = isFileUrl && !isFileUrlWithHost ? "" : urlObj.hostname;
    const host = isFileUrl && !isFileUrlWithHost ? "" : urlObj.host;
    const origin = prefix! + (isFileUrl && !isFileUrlWithHost ? "" : host);

    Object.defineProperties(urlObj, {
        protocol: { value: protocol },
        origin: { get: () => origin },
        hostname: { value: hostname },
        host: { value: host },
        href: { value: origin + urlObj.pathname + urlObj.search + urlObj.hash },
    });

    return urlObj;
}
