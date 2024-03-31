import bytes from '../../bytes/index.js';

const LF = bytes("\n"); // ^J - Enter on Linux
const CR = bytes("\r"); // ^M - Enter on macOS and Windows (CRLF)
const TAB = bytes("\t"); // ^I - Tab
const BS = bytes("\b"); // ^H - Backspace on Linux and Windows
const DEL = bytes([0x7f]); // ^? - Backspace on macOS
const ESC = bytes([0x1b]); // ^[ - Escape
const CANCEL = bytes([0x03]); // ^C - Cancel
const START = bytes([0x01]); // ^A - Start of text
const END = bytes([0x05]); // ^E - End of text
const CLR = bytes("\r\u001b[K"); // Clear the current line
const CLR_RIGHT = bytes("\u001b[0K");
const CLR_LEFT = bytes("\u001b[1K");
const LEFT = bytes("\u001b[D");
const RIGHT = bytes("\u001b[C");
const UP = bytes("\u001b[A");
const DOWN = bytes("\u001b[B");
const EMOJI_RE = /^(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200d(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;

export { BS, CANCEL, CLR, CLR_LEFT, CLR_RIGHT, CR, DEL, DOWN, EMOJI_RE, END, ESC, LEFT, LF, RIGHT, START, TAB, UP };
//# sourceMappingURL=constants.js.map
