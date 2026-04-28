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
  // Each cover QR encodes the cover URL with `?track=<t>`. A bystander scans
  // their preferred track from the host's screen and lands on the cover with
  // that track already selected — then they hit Begin.
  const trackQr = {};
  for (const t of TRACKS) {
    const url = `${SITE_URL}/?track=${t}`;
    trackQr[t] = { url, svg: await makeQr(url) };
  }
  return { trackQr };
}
