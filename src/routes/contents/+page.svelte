<script>
  import { base } from '$app/paths';
  import { chapters, flat } from '$lib/outline.js';
  import { TITLE } from '$lib/config.js';

  $effect(() => {
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prevOverflow; };
  });

  function romanize(n) {
    const r = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
               'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
    return r[n] || String(n);
  }
</script>

<svelte:head><title>Contents — {TITLE}</title></svelte:head>

<main class="page">
  <header class="top">
    <a class="mark" href="{base}/">{TITLE}</a>
    <nav class="top-nav"><a class="cover-link" href="{base}/">Cover ←</a></nav>
  </header>

  <div class="intro">
    <div class="kicker">Contents</div>
    <h1>{chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} · {flat.length} sections</h1>
  </div>

  <ol class="chapter-list">
    {#each chapters as ch (ch.id)}
      <li class="chapter">
        <header class="chapter-head">
          <div class="chapter-num">Chapter {romanize(ch.num)}</div>
          <h2 class="chapter-title">
            <a href="{base}/{ch.sections[0].num}">{ch.title}</a>
          </h2>
          {#if ch.intro}
            <p class="chapter-intro">{ch.intro}</p>
          {/if}
        </header>

        <ul class="entries">
          {#each ch.sections as e (e.num)}
            <li>
              <a class="entry" href="{base}/{e.num}">
                <span class="entry-num">{e.num}</span>
                <span class="entry-title">{e.title}</span>
              </a>
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ol>
</main>

<style>
  .page {
    min-height: 100vh; min-height: 100dvh;
    padding: 4vw 7vw 6vw;
    display: flex; flex-direction: column; gap: 3vw;
  }

  .top { display: flex; justify-content: space-between; align-items: center; font-family: var(--sans); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.24em; color: var(--muted); }
  .mark { font-family: var(--serif); font-style: italic; font-size: 1rem; letter-spacing: 0; text-transform: none; color: var(--ink); }
  .cover-link { color: var(--muted); transition: color 160ms; }
  .cover-link:hover { color: var(--ink); }

  .intro { max-width: 1100px; }
  .kicker { font-family: var(--sans); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.28em; color: var(--muted); margin-bottom: 1.2rem; }
  h1 { font-family: var(--serif); font-weight: 300; font-style: italic; font-size: clamp(2.4rem, 6vw, 4.8rem); line-height: 0.98; letter-spacing: -0.025em; color: var(--ink); }

  .chapter-list { list-style: none; margin: 1rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 3rem; }

  .chapter { border-top: 1px solid var(--rule); padding-top: 1.4rem; }

  .chapter-head { margin-bottom: 1rem; }
  .chapter-num { font-family: var(--sans); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.3em; color: var(--accent); }
  .chapter-title {
    font-family: var(--serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    line-height: 1.05;
    color: var(--ink);
    margin: 0.4rem 0 0.6rem;
  }
  .chapter-title a { color: inherit; border-bottom: 1px solid transparent; transition: border-color 160ms ease; }
  .chapter-title a:hover { border-bottom-color: var(--ink); }
  .chapter-intro {
    font-family: var(--serif);
    font-weight: 300;
    font-size: 0.98rem;
    line-height: 1.5;
    color: var(--muted);
    max-width: 60ch;
    margin: 0;
  }

  .entries { list-style: none; margin: 0; padding: 0; }
  .entry {
    display: grid;
    grid-template-columns: 3ch minmax(0, 1fr);
    gap: 1.2rem;
    align-items: baseline;
    padding: 0.5rem 0;
    border-bottom: 1px dotted var(--rule);
    color: var(--ink);
  }
  .entry:hover { background: rgba(20, 17, 13, 0.03); }
  .entry-num { font-family: var(--sans); font-size: 0.68rem; letter-spacing: 0.18em; color: var(--muted); }
  .entry-title { font-family: var(--serif); font-style: italic; font-weight: 300; font-size: clamp(0.98rem, 1.15vw, 1.12rem); color: var(--ink); overflow-wrap: break-word; }

  @media (max-width: 720px) {
    .entry { grid-template-columns: 2.4ch 1fr; }
  }
</style>
