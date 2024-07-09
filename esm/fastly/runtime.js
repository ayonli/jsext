import { env as env$1 } from 'fastly:env';
export { WellknownPlatforms, WellknownRuntimes, addShutdownListener, customInspect, default, isREPL, platform, refTimer, unrefTimer } from '../runtime.js';

// @ts-ignore
function env(name = undefined, value = undefined) {
    if (typeof name === "object") {
        throw new Error("Not implemented");
    }
    else if (value !== undefined) {
        throw new Error("Not implemented");
    }
    return env$1(name);
}

export { env };
//# sourceMappingURL=runtime.js.map
