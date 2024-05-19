/**
 * Functions and classes for collecting files into one single archive file, or
 * extracting files from a archive file.
 * 
 * This module currently supports the `tar` format.
 * @module
 * @experimental
 */

import Tarball, { TarEntry, TarEntryInfo } from "./archive/Tarball.ts";

export { Tarball };
export type { TarEntry, TarEntryInfo };
