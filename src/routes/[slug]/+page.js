import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';
import { flat } from '$lib/outline.js';
import { SITE_URL } from '$lib/config.js';

export const prerender = true;

export function entries() {
  return flat.map((s) => ({ slug: s.num }));
}

const TRACKS = ['systems', 'dynamic', 'beginner'];

async function makeQr(text) {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#14110d', light: '#00000000' }
  });
}

export async function load({ params }) {
  const section = flat.find((s) => s.num === params.slug);
  if (!section) throw error(404, 'Not found');

  const selfUrl = `${SITE_URL}/${section.num}`;

  // One QR per track. Each encodes `${selfUrl}?track=<t>` — and on chapters
  // that carry perspectives, also `#p-<t>` so the receiver lands on the same
  // perspective the sender was reading. The layout strips `?track=` after
  // applying it; the hash sticks.
  const qr = {};
  for (const t of TRACKS) {
    const hasPerspective = section.perspectives && section.perspectives[t];
    const url = hasPerspective
      ? `${selfUrl}?track=${t}#p-${t}`
      : `${selfUrl}?track=${t}`;
    qr[t] = { url, svg: await makeQr(url), hasPerspective: !!hasPerspective };
  }

  return { section, qr };
}
