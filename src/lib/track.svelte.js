// Reader-track preference. Three tracks:
//   systems  — readers from C, C++, C#         (label: C-track)
//   dynamic  — readers from Ruby, Python, JS   (label: Py-track)
//   beginner — readers new to programming      (label: 0-track)
// Persisted in localStorage.

import { browser } from '$app/environment';

const KEY = 'tml-track';
const DEFAULT = 'systems';
export const TRACKS = ['systems', 'dynamic', 'beginner'];
const VALID = new Set(TRACKS);

// Fallback chain when the current track has no content for a field.
// Beginner falls back to dynamic (gentler) before systems (terser).
const FALLBACKS = {
  systems: ['dynamic', 'beginner'],
  dynamic: ['systems', 'beginner'],
  beginner: ['dynamic', 'systems']
};

function read() {
  if (!browser) return DEFAULT;
  const v = localStorage.getItem(KEY);
  return VALID.has(v) ? v : DEFAULT;
}

let value = $state(read());

export const track = {
  get current() { return value; },
  set(next) {
    if (!VALID.has(next)) return;
    value = next;
    if (browser) localStorage.setItem(KEY, next);
  },
  cycle() {
    const i = TRACKS.indexOf(value);
    this.set(TRACKS[(i + 1) % TRACKS.length]);
  }
};

export function pickTrack(field, current) {
  if (field == null) return null;
  if (typeof field === 'string') return field;
  if (field[current] != null) return field[current];
  for (const fb of FALLBACKS[current] || []) {
    if (field[fb] != null) return field[fb];
  }
  // last resort: any value present
  for (const k of Object.keys(field)) {
    if (field[k] != null) return field[k];
  }
  return null;
}

export const TRACK_LABEL = {
  systems: 'C-track',
  dynamic: 'Py-track',
  beginner: '0-track'
};

export const TRACK_FULL = {
  systems: 'For readers from C, C++, C#',
  dynamic: 'For readers from Ruby, Python, JavaScript',
  beginner: 'For readers new to programming'
};

export const TRACK_BLURB = {
  systems: 'You already think in pointers, malloc, and RAII. Prose stays terse, leans on what you know, and points out where Rust\'s rules are stricter than yours.',
  dynamic: 'Indirection, ownership, and the heap are spelled out before they\'re used. No prior C in your background assumed; a working systems-level mental model built up section by section.',
  beginner: 'No programming background assumed. Concepts like "the heap", "a pointer", "owning a value", and "scope" are introduced one at a time, in plain language, with everyday analogies. Slower but solid.'
};
