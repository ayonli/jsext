/**
 * Functions and classes for collecting files into one single archive file, or
 * extracting files from a archive file.
 * 
 * This module currently supports the `tar` format, and is available in both
 * server and browser environments.
 * 
 * NOTE: This module depends on the Web Streams API, in Node.js, it requires
 * Node.js v18.0 or above.
 * 
 * NOTE: For Bun users, install this package from NPM instead of JSR, the NPM
 * version provides a polyfill of the `CompressionStream` and `DecompressionStream`
 * APIs, which is required for the gzip support.
 * @module
 */

import Tarball, { type TarEntry, type TarTree } from "./archive/Tarball.ts";
import tar, { type TarOptions } from "./archive/tar.ts";
import untar, { type UntarOptions } from "./archive/untar.ts";

export * from "./archive/errors.ts";
export { Tarball, tar, untar };
export type { TarEntry, TarTree, TarOptions, UntarOptions };
