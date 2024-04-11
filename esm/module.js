function interop(module, strict = undefined) {
    if (typeof module === "function") {
        return module().then(mod => interop(mod, strict));
    }
    else if (module instanceof Promise) {
        return module.then(mod => interop(mod, strict));
    }
    else if (typeof module === "object" && module !== null && !Array.isArray(module)) {
        if (typeof module["default"] === "object" &&
            module["default"] !== null &&
            !Array.isArray(module["default"])) {
            const hasEsModule = module["__esModule"] === true
                || module["default"]["__esModule"] === true;
            if (hasEsModule) {
                return module["default"];
            }
            else if (strict) {
                return module;
            }
            const moduleKeys = Object.getOwnPropertyNames(module)
                .filter(x => x !== "default" && x !== "__esModule").sort();
            const defaultKeys = Object.getOwnPropertyNames(module["default"])
                .filter(x => x !== "default" && x !== "__esModule").sort();
            if (String(moduleKeys) === String(defaultKeys)) {
                return module["default"];
            }
            else if (strict === false && !moduleKeys.length) {
                return module["default"];
            }
        }
    }
    return module;
}

export { interop };
//# sourceMappingURL=module.js.map
