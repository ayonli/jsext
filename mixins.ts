import type { Constructor } from "./index.ts";
import { hasOwn } from "./object/index.ts";

export type UnionToIntersection<U> = (
    U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

/**
 * Merges properties and methods only if they're missing in the class. 
 */
function mergeIfNotExists(proto: object, source: object, mergeSuper = false) {
    const props = Reflect.ownKeys(source);

    for (const prop of props) {
        if (prop == "constructor") {
            continue;
        } else if (mergeSuper) {
            // When merging properties from super classes, the properties in the
            // base class has the first priority and shall not be overwrite.
            if (!(prop in proto)) {
                setProp(proto, source, <string | symbol>prop);
            }
        } else if (!hasOwn(proto, prop)) {
            setProp(proto, source, <string | symbol>prop);
        }
    }

    return proto;
}

/**
 * Merges properties and methods across the prototype chain.
 */
function mergeHierarchy(ctor: Constructor, mixin: Constructor, mergeSuper = false) {
    mergeIfNotExists(ctor.prototype, mixin.prototype, mergeSuper);

    const _super = Object.getPrototypeOf(mixin);

    // Every user defined class or functions that can be instantiated have their
    // own names, if no name appears, that means the function has traveled to 
    // the root of the hierarchical tree.
    if (_super.name) {
        mergeHierarchy(ctor, _super, true);
    }
}

/**
 * Sets property for prototype based on the given source and prop name properly.
 */
function setProp(proto: any, source: any, prop: string | symbol) {
    const desc = Object.getOwnPropertyDescriptor(source, prop);

    if (desc) {
        Object.defineProperty(proto, prop, desc);
    } else {
        proto[prop] = source[prop];
    }
}

/**
 * Returns an extended class that combines all mixin methods.
 * 
 * This function does not mutates the base class but create a pivot class
 * instead.
 * 
 * @example
 * ```ts
 * class Log {
 *     log(text: string) {
 *         console.log(text);
 *     }
 * }
 * 
 * class View {
 *     display(data: Record<string, any>[]) {
 *         console.table(data);
 *     }
 * }
 * 
 * class Controller extends mixins(View, Log) {
 *     constructor(readonly topic: string) {
 *         super();
 *     }
 * }
 * 
 * const ctrl = new Controller("foo");
 * ctrl.log("something is happening");
 * ctrl.display([{ topic: ctrl.topic, content: "something is happening" }]);
 * 
 * console.assert(isSubclassOf(Controller, View));
 * console.assert(!isSubclassOf(Controller, Log));
 * ```
 */
export default function mixins<T extends Constructor<any>, M extends any[]>(
    base: T,
    ...mixins: { [X in keyof M]: Constructor<M[X]> }
): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;
export default function mixins<T extends Constructor<any>, M extends any[]>(
    base: T,
    ...mixins: M
): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;
export default function mixins(base: Constructor<any>, ...mixins: any[]) {
    const obj = { ctor: null as any as Constructor<any> };
    obj.ctor = class extends (<any>base) { }; // make sure this class has no name

    for (const mixin of mixins) {
        if (typeof mixin == "function") {
            mergeHierarchy(obj.ctor, mixin);
        } else if (mixin && typeof mixin == "object") {
            mergeIfNotExists(obj.ctor.prototype, mixin);
        } else {
            throw new TypeError("mixin must be a constructor or an object");
        }
    }

    return obj.ctor as Constructor<any>;
}

/**
 * Checks if a class is a subclass of another class.
 * 
 * @example
 * ```ts
 * class Moment extends Date {}
 * 
 * console.assert(isSubclassOf(Moment, Date));
 * console.assert(isSubclassOf(Moment, Object)); // all classes are subclasses of Object
 * ```
 */
export function isSubclassOf<A, B>(ctor1: Constructor<A>, ctor2: Constructor<B>): boolean {
    return typeof ctor1 === "function"
        && typeof ctor2 === "function"
        && ctor1.prototype instanceof ctor2;
}
