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
    await new Promise(resolve => setTimeout(resolve, 100));
    return text;
}
