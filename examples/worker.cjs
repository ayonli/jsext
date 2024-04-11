"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

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
    await new Promise(resolve => setTimeout(resolve, 1000));
    return text;
};

/**
 * @param {string[]} words 
 */
exports.sequence = function* sequence(words) {
    for (const word of words) {
        yield word;
    }

    return words.join(", ");
};
