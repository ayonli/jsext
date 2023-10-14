/**
 * @param {string} name 
 * @returns 
 */
export default async function (name) {
    return "Hello, " + name;
}

/**
 * @param {string} name 
 * @returns 
 */
export async function greet(name) {
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
export async function* sequence(words) {
    for (const word of words) {
        yield word;
    }

    return words.join(", ");
};

export function foo() {
    return "";
}
