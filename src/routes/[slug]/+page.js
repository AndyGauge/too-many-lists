import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';
import { flat } from '$lib/outline.js';

export const prerender = true;

export function entries() {
  return flat.map((s) => ({ slug: s.num }));
}

export async function load({ params }) {
  const section = flat.find((s) => s.num === params.slug);
  if (!section) throw error(404, 'Not found');

  const qrTarget = section.link || '';
  let qrSvg = '';
  if (qrTarget) {
    qrSvg = await QRCode.toString(qrTarget, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 0,
      color: { dark: '#14110d', light: '#00000000' }
    });
  }

  return { section, qrSvg, qrTarget };
}
