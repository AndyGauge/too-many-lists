// Local markdown wrapper. Adds inline code (`...`) on top of sveltekitbook's
// bold/em/link-only renderer. Code spans are extracted first so their contents
// are shielded from bold/em/link regexes, then restored as <code> at the end.

import { md as baseMd } from 'sveltekitbook/md';

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPE[c]);

// Control-char bookends survive baseMd's HTML escape (they're not in its set)
// and won't match any of its regexes (no asterisks, brackets, parens).
const OPEN = '';
const CLOSE = '';

export function md(text, opts) {
  if (!text) return '';
  const codes = [];

  const stripped = String(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `${OPEN}${codes.length - 1}${CLOSE}`;
  });

  let out = baseMd(stripped, opts);

  out = out.replace(new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g'), (_, i) => {
    return `<code>${escapeHtml(codes[Number(i)])}</code>`;
  });

  return out;
}
