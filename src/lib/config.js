// Book-wide metadata + service ids.
// Edit these freely; nothing else reads them outside of routes/.

export const TITLE = 'Learn Rust With Entirely Too Many Linked Lists';
export const AUTHOR = 'Aria Beingessner';
export const COAUTHOR = 'Andrew Gauger';
export const YEAR = 2026;
export const SOURCE_URL = 'https://rust-unofficial.github.io/too-many-lists/';
// Used to encode QR codes (self-URL + perspective anchor).
export const SITE_URL = 'https://andygauge.github.io/too-many-lists';

// Giscus (GitHub Discussions comments). Open https://giscus.app, select your
// repo, copy the four ids here. If any is blank, the comment widget simply
// doesn't render — safe default.
export const GISCUS = {
  repo: 'andygauge/too-many-lists',
  repoId: '',
  category: 'General',
  categoryId: ''
};
