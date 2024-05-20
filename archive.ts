/**
 * Functions and classes for collecting files into one single archive file, or
 * extracting files from a archive file.
 * 
 * This module currently supports the `tar` format, and is available in both
 * server and browser environments.
 * 
 * NOTE: This module depends on the Web Streams API, in Node.js, it requires
 * version v16.5 or higher.
 * @module
 * @experimental
 */

import Tarball, { type TarEntry } from "./archive/Tarball.ts";
import tar from "./archive/tar.ts";
import untar from "./archive/untar.ts";

export { Tarball, tar, untar };
export type { TarEntry };
