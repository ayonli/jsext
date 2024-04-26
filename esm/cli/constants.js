import bytes from '../bytes.js';

var ControlKeys;
(function (ControlKeys) {
    /** ^I - Tab */
    ControlKeys.TAB = bytes("\t");
    /** ^J - Enter on Linux */
    ControlKeys.LF = bytes("\n");
    /** ^M - Enter on macOS and Windows (CRLF) */
    ControlKeys.CR = bytes("\r");
    /** ^H - Backspace on Linux and Windows */
    ControlKeys.BS = bytes("\b");
    /** ^? - Backspace on macOS */
    ControlKeys.DEL = bytes([0x7f]);
    /** ^[ - Escape */
    ControlKeys.ESC = bytes([0x1b]);
    /** ^C - Cancel */
    ControlKeys.CTRL_C = bytes([0x03]);
    /** ^A - Start of line */
    ControlKeys.CTRL_A = bytes([0x01]);
    /** ^E - End of line */
    ControlKeys.CTRL_E = bytes([0x05]);
})(ControlKeys || (ControlKeys = {}));
var NavigationKeys;
(function (NavigationKeys) {
    NavigationKeys.UP = bytes("\u001b[A");
    NavigationKeys.DOWN = bytes("\u001b[B");
    NavigationKeys.LEFT = bytes("\u001b[D");
    NavigationKeys.RIGHT = bytes("\u001b[C");
    NavigationKeys.HOME = bytes("\u001b[H");
    NavigationKeys.END = bytes("\u001b[F");
    NavigationKeys.PAGE_UP = bytes("\u001b[5~");
    NavigationKeys.PAGE_DOWN = bytes("\u001b[6~");
    NavigationKeys.INSERT = bytes("\u001b[2~");
    NavigationKeys.DELETE = bytes("\u001b[3~");
})(NavigationKeys || (NavigationKeys = {}));
var FunctionKeys;
(function (FunctionKeys) {
    FunctionKeys.F1 = bytes("\u001bOP");
    FunctionKeys.F2 = bytes("\u001bOQ");
    FunctionKeys.F3 = bytes("\u001bOR");
    FunctionKeys.F4 = bytes("\u001bOS");
    FunctionKeys.F5 = bytes("\u001b[15~");
    FunctionKeys.F6 = bytes("\u001b[17~");
    FunctionKeys.F7 = bytes("\u001b[18~");
    FunctionKeys.F8 = bytes("\u001b[19~");
    FunctionKeys.F9 = bytes("\u001b[20~");
    FunctionKeys.F10 = bytes("\u001b[21~");
    FunctionKeys.F11 = bytes("\u001b[23~");
    FunctionKeys.F12 = bytes("\u001b[24~");
})(FunctionKeys || (FunctionKeys = {}));
var ControlSequences;
(function (ControlSequences) {
    /** Clear the current line */
    ControlSequences.CLR = bytes("\r\u001b[K");
    /** Clear the right side of the cursor */
    ControlSequences.CLR_RIGHT = bytes("\u001b[0K");
    /** Clear the left side of the cursor */
    ControlSequences.CLR_LEFT = bytes("\u001b[1K");
})(ControlSequences || (ControlSequences = {}));
const PowerShellCommands = [
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

export { ControlKeys, ControlSequences, FunctionKeys, NavigationKeys, PowerShellCommands };
//# sourceMappingURL=constants.js.map
