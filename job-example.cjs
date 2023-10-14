/**
 * @param {string} name 
 * @returns 
 */
exports.default = async function (name) {
    return "Hello, " + name;
};

/**
 * @param {string} name 
 * @returns 
 */
exports.greet = async function greet(name) {
    return "Hi, " + name;
};

/**
 * @param {string} text 
 * @returns 
 */
exports.takeTooLong = async function takeTooLong(text) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return text;
};

/**
 * @param {string[]} words 
 */
exports.sequence = async function* sequence(words) {
    for (const word of words) {
        yield word;
    }

    return words.join(", ");
};
