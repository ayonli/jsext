import { hasOwn, hasOwnMethod, patch, pick, omit, as, typeOf, isValid, isPlainObject, sanitize, sortKeys, flatKeys } from './index.js';

if (!Object.hasOwn) {
    Object.hasOwn = hasOwn;
}
if (!Object.hasOwnMethod) {
    Object.hasOwnMethod = hasOwnMethod;
}
Object.patch = patch;
Object.pick = pick;
Object.omit = omit;
Object.as = as;
Object.typeOf = typeOf;
Object.isValid = isValid;
Object.isPlainObject = isPlainObject;
Object.sanitize = sanitize;
Object.sortKeys = sortKeys;
Object.flatKeys = flatKeys;
//# sourceMappingURL=augment.js.map
