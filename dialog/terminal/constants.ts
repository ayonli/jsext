import bytes from "../../bytes/index.ts";

export const LF = bytes("\n"); // ^J - Enter on Linux
export const CR = bytes("\r"); // ^M - Enter on macOS and Windows (CRLF)
export const TAB = bytes("\t"); // ^I - Tab
export const BS = bytes("\b"); // ^H - Backspace on Linux and Windows
export const DEL = bytes([0x7f]); // ^? - Backspace on macOS
export const ESC = bytes([0x1b]); // ^[ - Escape
export const CANCEL = bytes([0x03]); // ^C - Cancel
export const START = bytes([0x01]); // ^A - Start of text
export const END = bytes([0x05]); // ^E - End of text
export const CLR = bytes("\r\u001b[K"); // Clear the current line
export const CLR_RIGHT = bytes("\u001b[0K");
export const CLR_LEFT = bytes("\u001b[1K");
export const LEFT = bytes("\u001b[D");
export const RIGHT = bytes("\u001b[C");
export const UP = bytes("\u001b[A");
export const DOWN = bytes("\u001b[B");

export const EMOJI_RE = /^(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200d(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
