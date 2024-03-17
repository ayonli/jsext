import { trim, trimEnd } from "../string/index.ts";
import { last } from "../array/index.ts";

export function isNotQuery(str: string): boolean {
    return str[0] !== "?" && str[0] !== "#";
}

export function isVolume(path: string, strict = false): boolean {
    return strict ? /^[a-z]:$/i.test(path) : /^[a-z]:(\\)?$/i.test(path);
}

/**
 * Checks if the given `path` is a Windows specific path.
 * @experimental
 */
export function isWindowsPath(path: string): boolean {
    return /^[a-z]:/.test(path) && path.slice(1, 4) !== "://";
}

/**
 * Checks if the given `path` is a Posix specific path.
 * @experimental
 */
export function isPosixPath(path: string): boolean {
    return /^\//.test(path);
}

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

export function isFileProtocol(path: string): boolean {
    return /^file:(\/\/)?$/i.test(path);
}

/**
 * Checks if the given `path` is an absolute path.
 * @experimental
 */
export function isAbsolute(path: string): boolean {
    return isPosixPath(path) || isWindowsPath(path) || isUrl(path);
}

/**
 * Checks if the `path` ends with the given `sub` path. This function ignores
 * the query string and the hash string, and is separator insensitive.
 * @experimental
 */
export function endsWith(path: string, sub: string): boolean {
    const paths = split(path).filter(isNotQuery).reverse();
    const subs = split(sub).filter(isNotQuery).reverse();

    if (paths.length < subs.length) {
        return false;
    }

    for (let i = 0; i < subs.length; i++) {
        if (subs[i] !== paths[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Splits the `path` into well-formed segments.
 * @experimental
 */
export function split(path: string): string[] {
    if (!path) {
        return [];
    } else if (isUrl(path)) {
        const { protocol, host, pathname, search, hash } = new URL(path);
        const origin = protocol + "//" + host;

        if (pathname === "/") {
            if (search && hash) {
                return [origin, search, hash];
            } else if (search) {
                return [origin, search];
            } else if (hash) {
                return [origin, hash];
            } else {
                return [origin];
            }
        } else {
            const segments = trim(pathname, "/").split(/[/\\]+/);

            if (search && hash) {
                return [origin, ...segments, search, hash];
            } else if (search) {
                return [origin, ...segments, search];
            } else if (hash) {
                return [origin, ...segments, hash];
            } else {
                return [origin, ...segments];
            }
        }
    } else if (isWindowsPath(path)) {
        const [_, volume, ...segments] = split("file:///" + path.replace(/[/\\]+/g, "/"));
        return [volume + "\\", ...segments];
    } else if (isPosixPath(path)) {
        const [_, ...segments] = split("file://" + path.replace(/[/\\]+/g, "/"));
        return ["/", ...segments];
    } else { // relative path
        path = path.replace(/[/\\]+/g, "/");
        const [_path, query] = path.split("?");

        if (query) {
            const segments = _path ? trimEnd(_path!, "/").split("/") : [];
            const [search, hash] = query.split("#");

            if (hash) {
                return [...segments, "?" + search, "#" + hash];
            } else {
                return [...segments, "?" + search];
            }
        } else {
            const [pathname, hash] = path.split("#");
            const segments = pathname ? trimEnd(pathname!, "/").split("/") : [];

            if (hash) {
                return [...segments, "#" + hash];
            } else {
                return segments;
            }
        }
    }
}
