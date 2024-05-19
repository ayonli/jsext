/**
 * Functions and classes for collecting files into one single archive file, or
 * extracting files from a archive file.
 * 
 * This module currently supports the `tar` format, and is available in both
 * server and browser environments.
 * @module
 * @experimental
 */

import Tarball, { TarEntry, TarEntryInfo } from "./archive/Tarball.ts";
import tar from "./archive/tar.ts";
import untar from "./archive/untar.ts";

export { Tarball, tar, untar };
export type { TarEntry, TarEntryInfo };
