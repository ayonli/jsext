import { hasOwn, hasOwnMethod, patch, pick, omit, as, isValid, isPlainObject } from './index.js';

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
Object.isValid = isValid;
Object.isPlainObject = isPlainObject;
//# sourceMappingURL=augment.js.map
