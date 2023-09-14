/**
 * @param {string} name 
 * @returns 
 */
exports.default = function (name) {
    return "Hello, " + name;
};

/**
 * @param {string} name 
 * @returns 
 */
exports.greet = function greet(name) {
    return "Hi, " + name;
};

/**
 * @param {string} text 
 * @returns 
 */
exports.takeTooLong = async function takeTooLong(text) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return text;
};
