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

  // Plain QR for the section's permalink (no anchor).
  const qrSvg = await makeQr(selfUrl);
  const qrTarget = selfUrl;

  // Per-track QRs when the section carries perspectives — each encodes the
  // permalink to that perspective so a scanned QR drops the receiver onto
  // the exact track the sender was reading.
  let qrPerspective = null;
  if (section.perspectives) {
    qrPerspective = {};
    for (const t of TRACKS) {
      if (section.perspectives[t]) {
        const url = `${selfUrl}#p-${t}`;
        qrPerspective[t] = { url, svg: await makeQr(url) };
      }
    }
  }

  return { section, qrSvg, qrTarget, qrPerspective };
}
