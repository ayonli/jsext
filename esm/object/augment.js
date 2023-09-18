import { hasOwn, hasOwnMethod, patch, pick, omit, as, isValid } from './index.js';

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
//# sourceMappingURL=augment.js.map
