import "./string/augment";
import "./number/augment";
import "./array/augment";
import "./uint8array/augment";
import "./object/augment";
import "./math/augment";
import "./promise/augment";
import "./collections/augment";
import "./error/augment";
declare global {
    interface Constructor<T> extends Function {
        new (...args: any[]): T;
        prototype: T;
    }
    type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
    type Ensured<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
}
