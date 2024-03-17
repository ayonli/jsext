import { trim, trimEnd } from '../string/index.js';

function isNotQuery(str) {
    return str[0] !== "?" && str[0] !== "#";
}
function isVolume(path, strict = false) {
    return strict ? /^[a-z]:$/i.test(path) : /^[a-z]:(\\)?$/i.test(path);
}
/**
 * Checks if the given `path` is a Windows specific path.
 * @experimental
 */
function isWindowsPath(path) {
    return /^[a-z]:/i.test(path) && path.slice(1, 4) !== "://";
}
/**
 * Checks if the given `path` is a Posix specific path.
 * @experimental
 */
function isPosixPath(path) {
    return /^\//.test(path);
}
/**
 * Checks if the given string is a URL, whether standard or non-standard.
 * @experimental
 */
function isUrl(str) {
    return /^[a-z](([a-z\-]+)?:\/\/\S+|[a-z\-]+:\/\/$)/i.test(str) || isFileUrl(str);
}
/**
 * Checks if the given string is a file URL, whether with or without `//`.
 * @experimental
 */
function isFileUrl(str) {
    return /^file:((\/\/|\/)\S+|\/?$)/i.test(str);
}
function isFileProtocol(path) {
    return /^file:(\/\/)?$/i.test(path);
}
/**
 * Checks if the given `path` is an absolute path.
 * @experimental
 */
function isAbsolute(path) {
    return isPosixPath(path) || isWindowsPath(path) || isUrl(path);
}
/**
 * Checks if the `path` ends with the given `sub` path. This function ignores
 * the query string and the hash string, and is separator insensitive.
 * @experimental
 */
function endsWith(path, sub) {
    const paths = split(path).filter(isNotQuery);
    const subs = split(sub).filter(isNotQuery);
    if (paths.length < subs.length) {
        return false;
    }
    else if (!subs.length) {
        return true;
    }
    if (isVolume(paths[0])) {
        paths[0] = paths[0].toLowerCase();
    }
    if (isVolume(subs[0])) {
        subs[0] = subs[0].toLowerCase();
    }
    paths.reverse();
    subs.reverse();
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
function split(path) {
    if (!path) {
        return [];
    }
    else if (isUrl(path)) {
        const { protocol, host, pathname, search, hash } = new URL(path);
        const origin = protocol + "//" + host;
        if (pathname === "/") {
            if (search && hash) {
                return [origin, search, hash];
            }
            else if (search) {
                return [origin, search];
            }
            else if (hash) {
                return [origin, hash];
            }
            else {
                return [origin];
            }
        }
        else {
            const segments = trim(pathname, "/").split(/[/\\]+/);
            if (search && hash) {
                return [origin, ...segments, search, hash];
            }
            else if (search) {
                return [origin, ...segments, search];
            }
            else if (hash) {
                return [origin, ...segments, hash];
            }
            else {
                return [origin, ...segments];
            }
        }
    }
    else if (isWindowsPath(path)) {
        const [_, volume, ...segments] = split("file:///" + path.replace(/[/\\]+/g, "/"));
        return [volume + "\\", ...segments];
    }
    else if (isPosixPath(path)) {
        const [_, ...segments] = split("file://" + path.replace(/[/\\]+/g, "/"));
        return ["/", ...segments];
    }
    else { // relative path
        path = path.replace(/[/\\]+/g, "/");
        const [_path, query] = path.split("?");
        if (query) {
            const segments = _path ? trimEnd(_path, "/").split("/") : [];
            const [search, hash] = query.split("#");
            if (hash) {
                return [...segments, "?" + search, "#" + hash];
            }
            else {
                return [...segments, "?" + search];
            }
        }
        else {
            const [pathname, hash] = path.split("#");
            const segments = pathname ? trimEnd(pathname, "/").split("/") : [];
            if (hash) {
                return [...segments, "#" + hash];
            }
            else {
                return segments;
            }
        }
    }
}

export { endsWith, isAbsolute, isFileProtocol, isFileUrl, isNotQuery, isPosixPath, isUrl, isVolume, isWindowsPath, split };
//# sourceMappingURL=util.js.map
