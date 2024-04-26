import bytes from "../bytes.ts";

export namespace ControlKeys {
    /** ^I - Tab */
    export const TAB = bytes("\t");
    /** ^J - Enter on Linux */
    export const LF = bytes("\n");
    /** ^M - Enter on macOS and Windows (CRLF) */
    export const CR = bytes("\r");
    /** ^H - Backspace on Linux and Windows */
    export const BS = bytes("\b");
    /** ^? - Backspace on macOS */
    export const DEL = bytes([0x7f]);
    /** ^[ - Escape */
    export const ESC = bytes([0x1b]);
    /** ^C - Cancel */
    export const CTRL_C = bytes([0x03]);
    /** ^A - Start of line */
    export const CTRL_A = bytes([0x01]);
    /** ^E - End of line */
    export const CTRL_E = bytes([0x05]);
}

export namespace NavigationKeys {
    export const UP = bytes("\u001b[A");
    export const DOWN = bytes("\u001b[B");
    export const LEFT = bytes("\u001b[D");
    export const RIGHT = bytes("\u001b[C");
    export const HOME = bytes("\u001b[H");
    export const END = bytes("\u001b[F");
    export const PAGE_UP = bytes("\u001b[5~");
    export const PAGE_DOWN = bytes("\u001b[6~");
    export const INSERT = bytes("\u001b[2~");
    export const DELETE = bytes("\u001b[3~");
}

export namespace FunctionKeys {
    export const F1 = bytes("\u001bOP");
    export const F2 = bytes("\u001bOQ");
    export const F3 = bytes("\u001bOR");
    export const F4 = bytes("\u001bOS");
    export const F5 = bytes("\u001b[15~");
    export const F6 = bytes("\u001b[17~");
    export const F7 = bytes("\u001b[18~");
    export const F8 = bytes("\u001b[19~");
    export const F9 = bytes("\u001b[20~");
    export const F10 = bytes("\u001b[21~");
    export const F11 = bytes("\u001b[23~");
    export const F12 = bytes("\u001b[24~");
}

export namespace ControlSequences {
    /** Clear the current line */
    export const CLR = bytes("\r\u001b[K");
    /** Clear the right side of the cursor */
    export const CLR_RIGHT = bytes("\u001b[0K");
    /** Clear the left side of the cursor */
    export const CLR_LEFT = bytes("\u001b[1K");
}

export const PowerShellCommands = [
    "ac",
    "asnp",
    "cat",
    "cd",
    "chdir",
    "clc",
    "clear",
    "clhy",
    "cli",
    "clp",
    "cls",
    "clv",
    "cnsn",
    "compare",
    "copy",
    "cp",
    "cpi",
    "cpp",
    "curl",
    "cvpa",
    "dbp",
    "del",
    "diff",
    "dir",
    "dnsn",
    "ebp",
    "echo",
    "epal",
    "epcsv",
    "epsn",
    "erase",
    "etsn",
    "exsn",
    "fc",
    "fl",
    "foreach",
    "ft",
    "fw",
    "gal",
    "gbp",
    "gc",
    "gci",
    "gcm",
    "gcs",
    "gdr",
    "ghy",
    "gi",
    "gjb",
    "gl",
    "gm",
    "gmo",
    "gp",
    "gps",
    "group",
    "gsn",
    "gsnp",
    "gsv",
    "gu",
    "gv",
    "gwmi",
    "h",
    "history",
    "icm",
    "iex",
    "ihy",
    "ii",
    "ipal",
    "ipcsv",
    "ipmo",
    "ipsn",
    "irm",
    "ise",
    "iwmi",
    "iwr",
    "kill",
    "lp",
    "ls",
    "man", "help",
    "md", "mkdir",
    "measure",
    "mi",
    "mount",
    "move",
    "mp",
    "mv",
    "nal",
    "ndr",
    "ni",
    "nmo",
    "npssc",
    "nsn",
    "nv",
    "ogv",
    "oh",
    "popd",
    "ps",
    "pushd",
    "pwd",
    "r",
    "rbp",
    "rcjb",
    "rcsn",
    "rd",
    "rdr",
    "ren",
    "ri",
    "rjb",
    "rm",
    "rmdir",
    "rmo",
    "rni",
    "rnp",
    "rp",
    "rsn",
    "rsnp",
    "rujb",
    "rv",
    "rvpa",
    "rwmi",
    "sajb",
    "sal",
    "saps",
    "sasv",
    "sbp",
    "sc",
    "select",
    "set",
    "shcm",
    "si"
];
