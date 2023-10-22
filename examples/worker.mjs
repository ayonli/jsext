/**
 * @param {string} name 
 * @returns 
 */
export default function (name) {
    return "Hello, " + name;
}

/**
 * @param {string} name 
 * @returns 
 */
export function greet(name) {
    return "Hi, " + name;
}

/**
 * @param {string} text 
 * @returns 
 */
export async function takeTooLong(text) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return text;
}

/**
 * @param {string[]} words 
 */
export function* sequence(words) {
    for (const word of words) {
        yield word;
    }

    return words.join(", ");
};

/**
 * @param {Error} err 
 */
export function transferError(err) {
    return err;
}

/**
 * @param {string} msg 
 */
export function throwError(msg) {
    throw new TypeError(msg);
}

/**
 * @param {any} value 
 */
export function throwUnserializableError(value) {
    return {
        int: BigInt(1),
        foo() {
            return null;
        },
    };
}

/**
 * @param {import("../chan.ts").Channel<{ value: number; done: boolean }>} channel 
 */
export async function twoTimesValues(channel) {
    /** @type {{ value: number; done: boolean }[]} */
    const data = [];

    for await (const { value, done } of channel) {
        data.push({ value: value * 2, done });

        if (done) {
            break;
        }
    }

    for (const item of data) {
        await channel.push(item);
    }

    channel.close();
    return data.length;
}

/**
 * @param {import("../chan.ts").Channel<{ value: number; done: boolean }>} channel 
 */
export async function threeTimesValues(channel) {
    /** @type {number[]} */
    const values = [];

    for await (const value of channel) {
        values.push(value * 3);
        await channel.push(value * 3);
        await new Promise(resolve => setTimeout(resolve, 5));

        if (values.length === 5) {
            break;
        }
    }

    return values;
}

/**
 * @param {ArrayBuffer} buf
 */
export function transfer(buf) {
    return buf.byteLength;
}

/**
 * @param {{[x:string]:any}} obj 
 */
export function transferInObject(obj) {
    return obj;
}
