<script>
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { flat, chapters } from '$lib/outline.js';
  import { createPager } from 'sveltekitbook/gestures';
  import { TITLE, AUTHOR, YEAR } from '$lib/config.js';
  import { track, TRACK_LABEL, TRACK_BLURB, TRACKS } from '$lib/track.svelte.js';

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
    <span>{AUTHOR ? `${AUTHOR} · ` : ''}{YEAR}</span>
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
    height: 100vh;
    height: 100dvh;
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
