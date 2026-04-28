import QRCode from 'qrcode';
import { SITE_URL } from '$lib/config.js';

export const prerender = true;

const TRACKS = ['systems', 'dynamic', 'beginner'];

async function makeQr(text) {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#14110d', light: '#00000000' }
  });
}

export async function load() {
  // Each cover QR encodes the URL of the first section with `?track=<t>` so a
  // bystander scans from the host's screen and lands directly on section 01
  // already locked into that track. The layout strips the query param after
  // applying it, so the URL the reader keeps is just `/01`.
  const trackQr = {};
  for (const t of TRACKS) {
    const url = `${SITE_URL}/01?track=${t}`;
    trackQr[t] = { url, svg: await makeQr(url) };
  }
  return { trackQr };
}
