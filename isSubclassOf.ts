import { Constructor } from "./index.ts";

/** Checks if a class is a subclass of another class. */
export default function isSubclassOf<T, B>(ctor1: Constructor<T>, ctor2: Constructor<B>): boolean {
    return typeof ctor1 === "function"
        && typeof ctor2 === "function"
        && ctor1.prototype instanceof ctor2;
}
