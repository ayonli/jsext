/**
 * Parses the `User-Agent` header or the `navigator.userAgent` property.
 */
function parseUserAgent(str) {
    var _a, _b, _c, _d;
    if (!str)
        throw new TypeError("The user agent string cannot be empty");
    const ua = {
        name: "",
        version: undefined,
        runtime: undefined,
        platform: "unknown",
        isMobile: /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(str),
        raw: str,
    };
    let matches = [...str.matchAll(/(\S+)\/(\d+(\.\d+)*)(\s\((.+?)\))?/g)].map((match) => {
        const [, name, version, , , extra] = match;
        return { name: name, version: version, extra };
    });
    if (matches.length === 0 && str.length) {
        ua.name = str;
        if (/Cloudflare[-\s]Workers?/i.test(str)) {
            ua.runtime = { identity: "workerd", version: undefined };
        }
        return ua;
    }
    const osInfo = (_a = matches.find(match => { var _a; return (_a = match.extra) === null || _a === void 0 ? void 0 : _a.includes(";"); })) === null || _a === void 0 ? void 0 : _a.extra;
    if (osInfo) {
        if (osInfo.includes("Macintosh") ||
            osInfo.includes("iPhone") ||
            osInfo.includes("iPad") ||
            osInfo.includes("iPod")) {
            ua.platform = "darwin";
        }
        else if (osInfo.includes("Windows")) {
            ua.platform = "windows";
        }
        else if (osInfo.includes("Android")) {
            ua.platform = "android";
        }
        else if (osInfo.includes("Linux")) {
            ua.platform = "linux";
        }
        else if (osInfo.includes("FreeBSD")) {
            ua.platform = "freebsd";
        }
        else if (osInfo.includes("OpenBSD")) {
            ua.platform = "openbsd";
        }
        else if (osInfo.includes("NetBSD")) {
            ua.platform = "netbsd";
        }
        else if (osInfo.includes("AIX")) {
            ua.platform = "aix";
        }
        else if (osInfo.match(/SunOS|Solaris/)) {
            ua.platform = "solaris";
        }
    }
    let safari = matches.find(match => match.name === "Safari");
    const chrome = matches.find(match => /Chrome|CriOS/i.test(match.name));
    const firefox = matches.find(match => /Firefox|FxiOS/i.test(match.name));
    const opera = matches.find(match => /Opera|OPR(iOS)?|OPT|OPR/i.test(match.name));
    const edge = matches.find(match => /Edg(e|A|iOS)?/i.test(match.name));
    const duckDuckGo = matches.find(match => /DuckDuckGo|Ddg(A|iOS)?/i.test(match.name));
    let node;
    let deno;
    let bun;
    if (ua.isMobile && ua.platform === "darwin" && !safari && !chrome && !firefox) {
        safari = matches.find(match => match.name === "AppleWebKit"); // fallback to WebKit
    }
    if (ua.isMobile && ua.platform === "darwin" && safari) {
        // In iOS and iPadOS, browsers are always Safari-based.
        ua.runtime = { identity: "safari", version: safari.version };
        if (opera) {
            ua.name = "Opera";
            ua.version = opera.version;
        }
        else if (edge) {
            ua.name = "Edge";
            ua.version = edge.version;
        }
        else if (chrome) {
            ua.name = "Chrome";
            ua.version = chrome.version;
        }
        else if (firefox) {
            ua.name = "Firefox";
            ua.version = firefox.version;
        }
        else if (duckDuckGo) {
            ua.name = "DuckDuckGo";
            ua.version = duckDuckGo.version;
        }
        else {
            const last = matches[matches.length - 1];
            ua.name = last.name;
            ua.version = last.version;
        }
    }
    else if (safari && !chrome && !firefox) {
        ua.runtime = { identity: "safari", version: safari.version };
        if (duckDuckGo) {
            ua.name = "DuckDuckGo";
            ua.version = duckDuckGo.version;
        }
        else {
            const index = matches.findIndex(match => match === safari);
            const next = (_b = matches[index + 1]) !== null && _b !== void 0 ? _b : matches[matches.length - 1];
            ua.name = next.name;
            ua.version = next.version;
        }
    }
    else if (chrome && !firefox) {
        ua.runtime = { identity: "chrome", version: chrome.version };
        if (opera) {
            ua.name = "Opera";
            ua.version = opera.version;
        }
        else if (edge) {
            ua.name = "Edge";
            ua.version = edge.version;
        }
        else if (duckDuckGo) {
            ua.name = "DuckDuckGo";
            ua.version = duckDuckGo.version;
        }
        else {
            const index = matches.findIndex(match => match === chrome);
            const next = (_c = matches[index + 1]) !== null && _c !== void 0 ? _c : matches[matches.length - 1];
            if (next.name === "Safari") { // Chrome pretending to be Safari
                ua.name = "Chrome";
                ua.version = chrome.version;
            }
            else {
                ua.name = next.name;
                ua.version = next.version;
            }
        }
    }
    else if (firefox && !chrome) {
        ua.runtime = { identity: "firefox", version: firefox.version };
        const index = matches.findIndex(match => match === firefox);
        const next = (_d = matches[index + 1]) !== null && _d !== void 0 ? _d : matches[matches.length - 1];
        if (next.name === "Safari") { // Firefox pretending to be Safari
            ua.name = "Firefox";
            ua.version = firefox.version;
        }
        else {
            ua.name = next.name;
            ua.version = next.version;
        }
    }
    else if (edge) { // Old Edge
        ua.name = "Edge";
        ua.version = edge.version;
    }
    else if (duckDuckGo) {
        ua.name = "DuckDuckGo";
        ua.version = duckDuckGo.version;
    }
    else if (node = matches.find(match => match.name === "Node.js")) {
        ua.name = "Node.js";
        ua.version = node.version;
        ua.runtime = { identity: "node", version: node.version };
    }
    else if (deno = matches.find(match => match.name === "Deno")) {
        ua.name = "Deno";
        ua.version = deno.version;
        ua.runtime = { identity: "deno", version: deno.version };
    }
    else if (bun = matches.find(match => match.name === "Bun")) {
        ua.name = "Bun";
        ua.version = bun.version;
        ua.runtime = { identity: "bun", version: bun.version };
    }
    else {
        const last = matches[matches.length - 1];
        ua.name = last.name;
        ua.version = last.version;
    }
    return ua;
}

export { parseUserAgent };
//# sourceMappingURL=user-agent.js.map
