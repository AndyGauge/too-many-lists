<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { flat, chapters } from '$lib/outline.js';
  import { createPager } from 'sveltekitbook/gestures';
  import { TITLE, AUTHOR, COAUTHOR, YEAR } from '$lib/config.js';
  import { track, TRACK_LABEL, TRACK_BLURB, TRACKS } from '$lib/track.svelte.js';

  function romanize(n) {
    const r = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
               'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
    return r[n] || String(n);
  }

  // Last section of each chapter is where its perspectives live.
  let perspectiveIndex = $derived(
    chapters
      .map((c) => {
        const last = c.sections[c.sections.length - 1];
        if (!last?.perspectives) return null;
        return {
          num: c.num,
          title: c.title,
          slug: last.num,
          tracks: TRACKS.filter((t) => last.perspectives[t])
        };
      })
      .filter(Boolean)
  );

  const TRACK_HEADING = {
    systems: 'From C, C++, C#',
    dynamic: 'From Ruby, Python, JavaScript',
    beginner: 'New to programming'
  };
  const TRACK_CTA = {
    systems: 'Begin in C-track →',
    dynamic: 'Begin in Py-track →',
    beginner: 'Begin in 0-track →'
  };

  let dragOffset = $state(0);
  let dragging = $derived(dragOffset !== 0);
  let activeTrack = $derived(track.current);

  $effect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  });

  function start() {
    goto(base + '/' + flat[0].num);
  }

  function pickTrack(t) {
    track.set(t);
    start();
  }

  const pager = createPager({
    onNext: start,
    onPrev: () => {},
    setOffset: (v) => {
      dragOffset = Math.min(0, v);
    }
  });

  function key(e) {
    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') start();
  }
</script>

<svelte:window onkeydown={key} />

<main
  class="cover"
  class:dragging
  onwheel={pager.onWheel}
  ontouchstart={pager.onTouchStart}
  ontouchmove={pager.onTouchMove}
  ontouchend={pager.onTouchEnd}
  ontouchcancel={pager.onTouchCancel}
  style:transform="translateX({dragOffset}px)"
>
  <div class="meta top">
    <span>
      {#if AUTHOR}{AUTHOR}{/if}{#if COAUTHOR} · co-author {COAUTHOR}{/if} · {YEAR}
    </span>
  </div>

  <div class="title-block">
    <h1 class="vt-title">{TITLE}</h1>
    <p class="sub">{chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} · {flat.length} sections. Three parallel reader tracks — pick yours.</p>

    <div class="tracks">
      {#each TRACKS as t (t)}
        <button class="track-card" class:active={activeTrack === t} onclick={() => pickTrack(t)}>
          <div class="track-tag">{TRACK_LABEL[t]}</div>
          <h2 class="track-title">{TRACK_HEADING[t]}</h2>
          <p class="track-blurb">{TRACK_BLURB[t]}</p>
          <span class="track-cta">{TRACK_CTA[t]}</span>
        </button>
      {/each}
    </div>

    {#if perspectiveIndex.length}
      <section class="perspectives-index" aria-label="Permalinks to chapter perspectives">
        <header class="perspectives-index-head">
          <span class="perspectives-index-kicker">Permalinks · perspectives</span>
          <span class="perspectives-index-hint">A chapter-end reflection from each track. Right-click a tag to copy.</span>
        </header>
        <ul class="perspectives-index-list">
          {#each perspectiveIndex as ch (ch.num)}
            <li class="perspectives-index-row">
              <span class="perspectives-index-chapter">
                <span class="perspectives-index-num">Ch {romanize(ch.num)}</span>
                <span class="perspectives-index-title">{ch.title}</span>
              </span>
              <span class="perspectives-index-links">
                {#each ch.tracks as t (t)}
                  <a class="perspectives-index-link" data-track={t} href="{base}/{ch.slug}#p-{t}">
                    {TRACK_LABEL[t]}
                  </a>
                {/each}
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>

  <div class="meta bottom">
    <button class="begin" onclick={start}>Continue in {TRACK_LABEL[activeTrack]}&nbsp;→</button>
    <nav class="cover-nav">
      <a href="{base}/contents">Contents</a>
    </nav>
    <span class="hint">Enter, arrow, swipe, or scroll · [ ] for chapter</span>
  </div>
</main>

<style>
  .cover {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 5vw 7vw;
    display: grid;
    grid-template-rows: auto 1fr auto;
    transition: transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1);
    touch-action: pan-y;
    will-change: transform;
  }

  .cover.dragging { transition: none; }

  .meta {
    font-family: var(--sans);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.2rem;
    flex-wrap: wrap;
  }

  .title-block { align-self: center; max-width: 1100px; }

  h1 {
    font-family: var(--serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(3.5rem, 12vw, 12rem);
    line-height: 0.9;
    letter-spacing: -0.035em;
    color: var(--ink);
  }

  .sub {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(1rem, 1.4vw, 1.3rem);
    color: var(--muted);
    margin-top: 1.6rem;
    max-width: 52ch;
    line-height: 1.4;
  }

  button.begin {
    font-family: var(--sans);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    padding: 1rem 1.6rem;
    background: var(--ink);
    color: var(--bg);
    border: none;
    cursor: pointer;
    transition: background 200ms ease;
  }
  button.begin:hover { background: var(--accent); }

  .tracks {
    margin-top: 2.4rem;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.2rem;
    max-width: 1200px;
  }

  .track-card {
    text-align: left;
    font-family: inherit;
    background: rgba(20, 17, 13, 0.03);
    border: 1px solid var(--rule);
    border-left-width: 3px;
    padding: 1.2rem 1.4rem 1.4rem;
    cursor: pointer;
    color: var(--ink);
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .track-card:hover {
    background: rgba(20, 17, 13, 0.06);
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  .track-card.active {
    border-left-color: var(--ink);
    background: rgba(20, 17, 13, 0.07);
  }

  .track-tag {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.32em;
    color: var(--accent);
  }
  .track-card.active .track-tag { color: var(--ink); font-weight: 600; }

  .track-title {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(1.2rem, 2vw, 1.6rem);
    line-height: 1.1;
    color: var(--ink);
    margin: 0;
  }

  .track-blurb {
    font-family: var(--serif);
    font-weight: 300;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--ink);
    margin: 0;
    max-width: 42ch;
  }

  .track-cta {
    margin-top: 0.4rem;
    font-family: var(--sans);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--muted);
    transition: color 160ms ease;
  }
  .track-card:hover .track-cta { color: var(--ink); }
  .track-card.active .track-cta { color: var(--ink); }

  @media (max-width: 1000px) {
    .tracks { grid-template-columns: 1fr; }
  }

  .perspectives-index {
    margin-top: 2.4rem;
    border-top: 1px solid var(--rule);
    padding-top: 1.6rem;
    max-width: 1100px;
  }
  .perspectives-index-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .perspectives-index-kicker {
    font-family: var(--sans);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: var(--accent);
    font-weight: 600;
  }
  .perspectives-index-hint {
    font-family: var(--serif);
    font-style: italic;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .perspectives-index-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .perspectives-index-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1.5rem;
    align-items: baseline;
    padding: 0.55rem 0;
    border-bottom: 1px dotted var(--rule);
  }
  .perspectives-index-row:last-child { border-bottom: none; }
  .perspectives-index-chapter {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
    min-width: 0;
  }
  .perspectives-index-num {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: var(--muted);
    white-space: nowrap;
  }
  .perspectives-index-title {
    font-family: var(--serif);
    font-style: italic;
    font-size: 1rem;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .perspectives-index-links {
    display: inline-flex;
    gap: 0.4rem;
  }
  .perspectives-index-link {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--muted);
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--rule);
    transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
  }
  .perspectives-index-link:hover {
    color: var(--ink);
    border-color: var(--ink);
    background: rgba(20, 17, 13, 0.04);
  }
  .perspectives-index-link[data-track='systems']:hover { color: #8a6a3a; border-color: #8a6a3a; }
  .perspectives-index-link[data-track='dynamic']:hover { color: #3a6a9a; border-color: #3a6a9a; }
  .perspectives-index-link[data-track='beginner']:hover { color: #4a7a4a; border-color: #4a7a4a; }

  @media (max-width: 600px) {
    .perspectives-index-row {
      grid-template-columns: 1fr;
      gap: 0.4rem;
    }
    .perspectives-index-links { flex-wrap: wrap; }
  }

  .hint {
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .cover-nav {
    display: flex;
    gap: 0.9rem;
    font-family: var(--sans);
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .cover-nav :global(a) {
    border-bottom: 1px solid transparent;
    transition: color 160ms ease, border-color 160ms ease;
  }
  .cover-nav :global(a:hover) {
    color: var(--ink);
    border-bottom-color: var(--ink);
  }
</style>
