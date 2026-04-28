<script>
  import { goto, afterNavigate } from '$app/navigation';
  import { base } from '$app/paths';
  import {
    next, prev, flat, chapters,
    chapterOf, nextChapter, prevChapter,
    isFirstOfChapter, isLastOfChapter, positionInChapter
  } from '$lib/outline.js';
  import { createPager } from 'sveltekitbook/gestures';
  import { md } from '$lib/md.js';
  import Giscus from 'sveltekitbook/Giscus.svelte';
  import { TITLE, GISCUS } from '$lib/config.js';
  import { track, pickTrack, TRACK_LABEL, TRACK_FULL, TRACKS } from '$lib/track.svelte.js';

  let { data } = $props();
  let section = $derived(data.section);
  let activeTrack = $derived(track.current);
  let resolvedGesture = $derived(pickTrack(section.gesture, activeTrack));
  let resolvedBody = $derived(pickTrack(section.body, activeTrack));
  let resolvedTldr = $derived(pickTrack(section.tldr, activeTrack));
  let chapterHasPerspectives = $derived(chapter?.sections.some((s) => s.perspectives));
  let nextSection = $derived(next(section.num));
  let prevSection = $derived(prev(section.num));
  let chapter = $derived(chapterOf(section.num));
  let nextCh = $derived(nextChapter(section.num));
  let prevCh = $derived(prevChapter(section.num));
  let chapterPos = $derived(positionInChapter(section.num));
  let firstOfChapter = $derived(isFirstOfChapter(section.num));
  let lastOfChapter = $derived(isLastOfChapter(section.num));
  let position = $derived(section.orderIndex + 1);
  let total = flat.length;

  let dragOffset = $state(0);
  let dragging = $derived(dragOffset !== 0);
  let bodyEl = $state();

  afterNavigate(() => {
    bodyEl?.scrollTo({ top: 0, behavior: 'instant' });
  });

  const pager = createPager({
    onNext: () => {
      if (nextSection) goto(base + '/' + nextSection.num);
    },
    onPrev: () => {
      if (prevSection) goto(base + '/' + prevSection.num);
      else goto(base + '/');
    },
    setOffset: (v) => {
      dragOffset = v;
    }
  });

  function key(e) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (nextSection) goto(base + '/' + nextSection.num);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (prevSection) goto(base + '/' + prevSection.num);
      else goto(base + '/');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      bodyEl?.scrollBy({ top: 180, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      bodyEl?.scrollBy({ top: -180, behavior: 'smooth' });
    } else if (e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      bodyEl?.scrollBy({ top: bodyEl.clientHeight * 0.85, behavior: 'smooth' });
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      bodyEl?.scrollBy({ top: -bodyEl.clientHeight * 0.85, behavior: 'smooth' });
    } else if (e.key === '[') {
      e.preventDefault();
      if (prevCh) goto(base + '/' + prevCh.sections[0].num);
    } else if (e.key === ']') {
      e.preventDefault();
      if (nextCh) goto(base + '/' + nextCh.sections[0].num);
    } else if (e.key === 'Escape') {
      goto(base + '/');
    }
  }

  let hintProgress = $derived(Math.min(1, Math.abs(dragOffset) / 70));
  let mdOpts = $derived({});
  let chRoman = $derived(romanize(chapter?.num));

  function romanize(n) {
    if (!n) return '';
    const r = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
               'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
    return r[n] || String(n);
  }
</script>

<svelte:window onkeydown={key} />

<main
  class="page"
  class:dragging
  onwheel={pager.onWheel}
  ontouchstart={pager.onTouchStart}
  ontouchmove={pager.onTouchMove}
  ontouchend={pager.onTouchEnd}
  ontouchcancel={pager.onTouchCancel}
  style:transform="translateX({dragOffset}px)"
>
  <header class="top">
    <a class="mark vt-title" href="{base}/">{TITLE}</a>
    <nav class="top-nav">
      <div class="track-segment" role="radiogroup" aria-label="Reader track">
        {#each TRACKS as t (t)}
          <button
            type="button"
            class="track-seg"
            class:active={activeTrack === t}
            role="radio"
            aria-checked={activeTrack === t}
            title={TRACK_FULL[t]}
            onclick={() => track.set(t)}
          >{TRACK_LABEL[t]}</button>
        {/each}
      </div>
      <a href="{base}/contents">Contents</a>
    </nav>
  </header>

  {#if chapter}
    <div class="chapter-rail">
      <div class="chapter-meta">
        {#if prevCh}
          <a class="ch-jump" href="{base}/{prevCh.sections[0].num}" title="Previous chapter ({prevCh.title})">
            <span class="ch-jump-arrow">←</span>
            <span class="ch-jump-label">Ch {romanize(prevCh.num)}</span>
          </a>
        {:else}
          <span class="ch-jump disabled"><span class="ch-jump-arrow">←</span></span>
        {/if}

        <div class="ch-current">
          <span class="ch-num">Chapter {romanize(chapter.num)}</span>
          <span class="ch-title">{chapter.title}</span>
        </div>

        {#if nextCh}
          <a class="ch-jump right" href="{base}/{nextCh.sections[0].num}" title="Next chapter ({nextCh.title})">
            <span class="ch-jump-label">Ch {romanize(nextCh.num)}</span>
            <span class="ch-jump-arrow">→</span>
          </a>
        {:else}
          <span class="ch-jump right disabled"><span class="ch-jump-arrow">→</span></span>
        {/if}
      </div>

      <ol class="ch-dots" aria-label="Sections in this chapter">
        {#each chapter.sections as s (s.num)}
          <li>
            <a
              class="dot"
              class:active={s.num === section.num}
              href="{base}/{s.num}"
              title="{s.title}"
              aria-current={s.num === section.num ? 'page' : undefined}
            >
              <span class="sr">{s.num} — {s.title}</span>
            </a>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  <div class="body" bind:this={bodyEl}>
    {#if firstOfChapter && chapter?.intro && !chapterHasPerspectives}
      <aside class="ch-intro">
        <div class="ch-intro-label">Chapter {romanize(chapter.num)}</div>
        <h2 class="ch-intro-title">{chapter.title}</h2>
        <p class="ch-intro-body">{@html md(chapter.intro, mdOpts)}</p>
      </aside>
    {/if}

    <div class="number">{section.num}</div>

    <h1 class="title">{section.title}</h1>

    {#if resolvedGesture}
      <p class="gesture">{@html md(resolvedGesture, mdOpts)}</p>
    {/if}

    {#if resolvedBody}
      <p class="body-text">{@html md(resolvedBody, mdOpts)}</p>
    {/if}

    {#if section.editionNotes?.length}
      <div class="edition-stripe">
        {#each section.editionNotes as note, i (i)}
          <aside class="edition-note edition-{note.edition}">
            <div class="edition-badge">Rust {note.edition}</div>
            <div class="edition-body">{@html md(note.body, mdOpts)}</div>
          </aside>
        {/each}
      </div>
    {/if}

    {#if section.steps?.length}
      <ol class="steps">
        {#each section.steps as step, i (i)}
          {@const stepProse = pickTrack(step.prose, activeTrack)}
          <li class="step">
            <div class="step-marker" aria-hidden="true">{String(i + 1).padStart(2, '0')}</div>
            <div class="step-prose">{@html md(stepProse, mdOpts)}</div>
            {#if step.code}
              <pre class="step-code"><code class="lang-{step.lang || 'text'}">{step.code}</code></pre>
            {/if}
            {#if step.editionNotes?.length}
              {#each step.editionNotes as note, ni (ni)}
                <aside class="edition-note edition-{note.edition} edition-step">
                  <div class="edition-badge">Rust {note.edition}</div>
                  <div class="edition-body">{@html md(note.body, mdOpts)}</div>
                </aside>
              {/each}
            {/if}
          </li>
        {/each}
      </ol>
    {/if}

    {#if section.citation || section.link}
      <footer class="source">
        {#if section.citation}
          <span class="cite">{@html md(section.citation, mdOpts)}</span>
        {/if}
        {#if section.link}
          <a class="source-link" href={section.link} target="_blank" rel="noopener noreferrer">
            Source →
          </a>
        {/if}
      </footer>
    {/if}

    {#if section.eli5}
      <aside class="eli5">
        <div class="eli5-label">In plain terms</div>
        <p class="eli5-body">{@html md(section.eli5, mdOpts)}</p>
      </aside>
    {/if}

    {#if resolvedTldr}
      <aside class="tldr">
        <div class="tldr-label">TL;DR</div>
        <p class="tldr-body">{@html md(resolvedTldr, mdOpts)}</p>
      </aside>
    {:else}
      <aside class="tldr tldr-missing" aria-hidden="true">
        <div class="tldr-label">TL;DR — to be written</div>
      </aside>
    {/if}

    {#if lastOfChapter && section.perspectives}
      <aside class="perspectives" aria-label="Chapter perspectives">
        <div class="perspectives-head">
          <div class="perspectives-kicker">End of Chapter {chapter ? romanize(chapter.num) : ''}</div>
          <h2 class="perspectives-title">Three perspectives on what you just read</h2>
        </div>
        {#each TRACKS as t (t)}
          {#if section.perspectives[t]}
            <article id="p-{t}" class="perspective" class:current={activeTrack === t}>
              <header class="perspective-head">
                <a class="perspective-tag" href="#p-{t}" title="Permalink to {TRACK_LABEL[t]} perspective">
                  <span class="perspective-anchor" aria-hidden="true">#</span>{TRACK_LABEL[t]}
                </a>
                <span class="perspective-full">{TRACK_FULL[t]}</span>
              </header>
              <div class="perspective-body">{@html md(section.perspectives[t], mdOpts)}</div>
            </article>
          {/if}
        {/each}
      </aside>
    {/if}

    {#if data.qr?.[activeTrack]}
      {@const active = data.qr[activeTrack]}
      <aside class="page-qr">
        <a class="page-qr-link" href={active.url} title={active.url}>
          <span class="page-qr-svg">{@html active.svg}</span>
          <span class="page-qr-meta">
            <span class="page-qr-label">Permalink · {TRACK_LABEL[activeTrack]}{active.hasPerspective ? ' perspective' : ''}</span>
            <span class="page-qr-url">{active.url.replace(/^https?:\/\//, '')}</span>
            <span class="page-qr-hint">Scan or tap to share this view in this track</span>
          </span>
        </a>
      </aside>
    {/if}

    {#if lastOfChapter && nextCh}
      <aside class="ch-next">
        <div class="ch-next-label">End of Chapter {romanize(chapter.num)}</div>
        <a class="ch-next-link" href="{base}/{nextCh.sections[0].num}">
          <span class="ch-next-num">Chapter {romanize(nextCh.num)}</span>
          <span class="ch-next-title">{nextCh.title}</span>
          <span class="ch-next-arrow">→</span>
        </a>
      </aside>
    {/if}

    <Giscus term={section.num} mode="light" {...GISCUS} />
  </div>

  <footer class="bottom">
    <div class="nav">
      {#if prevSection}
        <a href="{base}/{prevSection.num}" class="nav-link">
          <span class="arrow">←</span>
          <span class="nav-meta">
            <span class="nav-num">{prevSection.num}</span>
            <span class="nav-title">{prevSection.title}</span>
          </span>
        </a>
      {:else}
        <a href="{base}/" class="nav-link">
          <span class="arrow">←</span>
          <span class="nav-meta"><span class="nav-num">Cover</span></span>
        </a>
      {/if}

      <div class="progress">
        {#if chapterPos}
          <span class="ch-progress">{chapterPos.index + 1}/{chapterPos.total}</span>
          <span class="divider">·</span>
        {/if}
        <span>{position}</span><span class="divider">/</span><span>{total}</span>
      </div>

      {#if nextSection}
        <a href="{base}/{nextSection.num}" class="nav-link right">
          <span class="nav-meta">
            <span class="nav-num">{nextSection.num}</span>
            <span class="nav-title">{nextSection.title}</span>
          </span>
          <span class="arrow">→</span>
        </a>
      {:else}
        <span class="nav-link right disabled">
          <span class="nav-meta"><span class="nav-num">End</span></span>
        </span>
      {/if}
    </div>

    <div class="drag-hint" style:opacity={hintProgress}>
      <span class="bar" style:transform="scaleX({hintProgress})"></span>
    </div>
  </footer>
</main>

<style>
  .page {
    height: 100vh;
    height: 100dvh;
    padding: 3vw 5vw;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    gap: 1.5vw;
    transition: transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1);
    touch-action: pan-y;
    will-change: transform;
    overflow: hidden;
  }
  .page.dragging { transition: none; }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--sans);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: var(--muted);
  }

  .mark {
    font-family: var(--serif);
    font-style: italic;
    font-size: 1rem;
    letter-spacing: 0;
    text-transform: none;
    color: var(--ink);
  }

  .top-nav { display: flex; gap: 0.9rem; align-items: center; }
  .track-segment {
    display: inline-flex;
    border: 1px solid var(--rule);
    background: rgba(20, 17, 13, 0.03);
  }
  .track-seg {
    font-family: var(--sans);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--muted);
    background: transparent;
    border: none;
    padding: 0.4rem 0.65rem;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;
    border-right: 1px solid var(--rule);
  }
  .track-seg:last-child { border-right: none; }
  .track-seg:hover { color: var(--ink); background: rgba(20, 17, 13, 0.05); }
  .track-seg.active {
    color: var(--bg);
    background: var(--ink);
    font-weight: 600;
  }
  .top-nav :global(a) {
    border-bottom: 1px solid transparent;
    transition: border-color 160ms ease, color 160ms ease;
  }
  .top-nav :global(a:hover) { color: var(--ink); border-bottom-color: var(--ink); }

  .perspectives {
    grid-column: 2;
    margin-top: 2.4rem;
    max-width: 64ch;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .perspectives-head { margin-bottom: 0.4rem; }
  .perspectives-kicker {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.32em;
    color: var(--accent);
  }
  .perspectives-title {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(1.4rem, 2.4vw, 1.9rem);
    color: var(--ink);
    margin: 0.3rem 0 0;
    line-height: 1.1;
  }
  .perspective {
    border: 1px solid var(--rule);
    border-left-width: 3px;
    background: rgba(20, 17, 13, 0.02);
    padding: 0.9rem 1.2rem 1rem;
    scroll-margin-top: 2rem;
  }
  .perspective:target {
    border-color: var(--accent);
    border-left-color: var(--ink);
    background: rgba(20, 17, 13, 0.07);
    box-shadow: 0 0 0 2px rgba(20, 17, 13, 0.06);
  }
  .perspective.current {
    border-left-color: var(--ink);
    background: rgba(20, 17, 13, 0.05);
  }
  .perspective-head {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
    flex-wrap: wrap;
    margin-bottom: 0.45rem;
  }
  .perspective-tag {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: baseline;
    gap: 0.15rem;
    transition: color 160ms ease;
  }
  .perspective-anchor {
    color: var(--muted);
    opacity: 0;
    transition: opacity 160ms ease;
    margin-right: 0.1rem;
  }
  .perspective-tag:hover { color: var(--ink); }
  .perspective-tag:hover .perspective-anchor { opacity: 1; }
  .perspective.current .perspective-tag { color: var(--ink); }
  .perspective-full {
    font-family: var(--serif);
    font-style: italic;
    font-size: 0.86rem;
    color: var(--muted);
  }
  .perspective-body {
    font-family: var(--serif);
    font-weight: 300;
    font-size: 1rem;
    line-height: 1.55;
    color: var(--ink);
  }
  .perspective-body :global(p) { margin: 0 0 0.7rem; }
  .perspective-body :global(p:last-child) { margin-bottom: 0; }
  .perspective-body :global(code) {
    font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.88em;
    background: rgba(20, 17, 13, 0.08);
    padding: 0.05rem 0.3rem;
    border-radius: 2px;
  }

  .page-qr {
    grid-column: 2;
    margin-top: 1.6rem;
    max-width: 56ch;
  }
  .page-qr-link {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.1rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border: 1px solid var(--rule);
    background: rgba(20, 17, 13, 0.02);
    color: var(--ink);
    transition: border-color 180ms ease, background 180ms ease;
  }
  .page-qr-link:hover {
    border-color: var(--accent);
    background: rgba(20, 17, 13, 0.04);
  }
  .page-qr-svg :global(svg) {
    display: block;
    width: 84px;
    height: 84px;
  }
  .page-qr-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .page-qr-label {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: var(--accent);
  }
  .page-qr-url {
    font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.78rem;
    color: var(--ink);
    overflow-wrap: anywhere;
    word-break: break-all;
  }
  .page-qr-hint {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--muted);
  }

  .chapter-rail {
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
    padding: 0.7rem 0;
    display: grid;
    gap: 0.5rem;
  }

  .chapter-meta {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: baseline;
    gap: 1rem;
  }

  .ch-jump {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    font-family: var(--sans);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--muted);
    transition: color 160ms ease;
  }
  .ch-jump:hover { color: var(--ink); }
  .ch-jump.disabled { opacity: 0.25; }
  .ch-jump.right { justify-self: end; }
  .ch-jump-arrow { font-family: var(--serif); font-size: 0.95rem; letter-spacing: 0; }

  .ch-current {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .ch-num {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.32em;
    color: var(--muted);
  }
  .ch-title {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 300;
    font-size: 1.05rem;
    color: var(--ink);
    margin-top: 0.15rem;
  }

  .ch-dots {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }
  .ch-dots .dot {
    display: block;
    width: 1.4rem;
    height: 4px;
    background: var(--rule);
    transition: background 160ms ease, transform 160ms ease;
  }
  .ch-dots .dot:hover { background: var(--muted); }
  .ch-dots .dot.active {
    background: var(--accent);
    transform: scaleY(1.6);
  }
  .sr {
    position: absolute;
    width: 1px; height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .body {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) 3fr;
    gap: 4vw;
    align-items: start;
    padding: 1.5vw 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .ch-intro {
    grid-column: 1 / -1;
    border-left: 2px solid var(--accent);
    padding: 0.8rem 1.4rem;
    background: rgba(20, 17, 13, 0.03);
    margin-bottom: 0.5rem;
  }
  .ch-intro-label {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: var(--accent);
  }
  .ch-intro-title {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 300;
    font-size: clamp(1.4rem, 2.2vw, 1.8rem);
    color: var(--ink);
    margin: 0.3rem 0 0.7rem;
  }
  .ch-intro-body {
    font-family: var(--serif);
    font-weight: 300;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--ink);
    max-width: 60ch;
  }

  .number {
    grid-column: 1;
    font-family: var(--serif);
    font-weight: 200;
    font-size: clamp(4rem, 9vw, 9rem);
    line-height: 0.9;
    letter-spacing: -0.03em;
    color: var(--muted);
    font-variant-numeric: lining-nums tabular-nums;
    margin-top: 0.5rem;
  }

  .title {
    grid-column: 2;
    font-family: var(--serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(2.4rem, 6vw, 6rem);
    line-height: 0.97;
    letter-spacing: -0.025em;
    color: var(--ink);
    max-width: 18ch;
  }

  .gesture {
    grid-column: 2;
    font-family: var(--serif);
    font-weight: 300;
    font-size: clamp(1.1rem, 1.5vw, 1.4rem);
    line-height: 1.4;
    color: var(--ink);
    max-width: 44ch;
    margin-top: 1.6rem;
    border-left: 2px solid var(--accent);
    padding-left: 1.3rem;
  }

  .body-text {
    grid-column: 2;
    font-family: var(--serif);
    font-weight: 300;
    font-size: clamp(0.95rem, 1.05vw, 1.05rem);
    line-height: 1.55;
    color: var(--ink);
    max-width: 56ch;
    margin-top: 1.2rem;
    padding-left: 1.3rem;
  }

  .steps {
    grid-column: 2;
    list-style: none;
    margin: 1.6rem 0 0;
    padding: 0;
    max-width: 64ch;
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
  }
  .step {
    display: grid;
    grid-template-columns: 2.4rem 1fr;
    gap: 0.8rem 1rem;
    align-items: start;
    padding-left: 1.3rem;
    border-left: 2px solid var(--rule);
  }
  .step:hover { border-left-color: var(--accent); }
  .step-marker {
    grid-column: 1;
    grid-row: 1;
    font-family: var(--sans);
    font-size: 0.62rem;
    letter-spacing: 0.2em;
    color: var(--muted);
    margin-top: 0.3rem;
  }
  .step-prose {
    grid-column: 2;
    grid-row: 1;
    font-family: var(--serif);
    font-weight: 300;
    font-size: 1rem;
    line-height: 1.55;
    color: var(--ink);
  }
  .step-prose :global(p) { margin: 0; }
  .step-prose :global(code) {
    font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.88em;
    background: rgba(20, 17, 13, 0.06);
    padding: 0.05rem 0.3rem;
    border-radius: 2px;
  }
  .step-code {
    grid-column: 1 / -1;
    grid-row: 2;
    margin: 0.2rem 0 0;
    padding: 0.9rem 1.1rem;
    background: rgba(20, 17, 13, 0.04);
    font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.85rem;
    line-height: 1.55;
    color: var(--ink);
    overflow-x: auto;
    white-space: pre;
    -webkit-overflow-scrolling: touch;
  }
  .step-code code {
    font-family: inherit;
    background: transparent;
    padding: 0;
  }

  .source {
    grid-column: 2;
    margin-top: 1.4rem;
    padding: 0.8rem 0 0 1.3rem;
    border-top: 1px dotted var(--rule);
    max-width: 56ch;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .cite {
    font-family: var(--serif);
    font-style: italic;
    font-size: 0.82rem;
    color: var(--muted);
    line-height: 1.4;
  }

  .source-link {
    font-family: var(--sans);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--accent);
    border-bottom: 1px solid transparent;
    white-space: nowrap;
    transition: border-color 180ms ease;
  }
  .source-link:hover { border-color: var(--accent); }

  .tldr {
    grid-column: 2;
    margin-top: 2rem;
    max-width: 56ch;
    padding: 1rem 1.3rem 1.1rem;
    border-top: 2px solid var(--ink);
    background: rgba(20, 17, 13, 0.04);
  }
  .tldr-label {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.34em;
    color: var(--ink);
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  .tldr-body {
    font-family: var(--serif);
    font-weight: 400;
    font-size: clamp(1rem, 1.15vw, 1.15rem);
    line-height: 1.5;
    color: var(--ink);
    margin: 0;
  }
  .tldr-body :global(code) {
    font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.88em;
    background: rgba(20, 17, 13, 0.08);
    padding: 0.05rem 0.3rem;
    border-radius: 2px;
  }
  .tldr-missing {
    border-top-color: var(--rule);
    background: repeating-linear-gradient(
      45deg,
      rgba(20, 17, 13, 0.02),
      rgba(20, 17, 13, 0.02) 8px,
      rgba(20, 17, 13, 0.05) 8px,
      rgba(20, 17, 13, 0.05) 16px
    );
  }
  .tldr-missing .tldr-label { color: var(--muted); font-weight: 400; }

  .edition-stripe {
    grid-column: 2;
    margin-top: 1.4rem;
    max-width: 56ch;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .edition-note {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.9rem;
    align-items: baseline;
    padding: 0.7rem 1rem;
    border: 1px solid var(--rule);
    border-left-width: 3px;
    background: rgba(20, 17, 13, 0.02);
    font-family: var(--serif);
    font-weight: 300;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--ink);
  }
  .edition-note.edition-2021 { border-left-color: #b88a3a; }
  .edition-note.edition-2024 { border-left-color: #3a78b8; }
  .edition-badge {
    font-family: var(--sans);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.26em;
    color: var(--muted);
    white-space: nowrap;
  }
  .edition-2021 .edition-badge { color: #b88a3a; }
  .edition-2024 .edition-badge { color: #3a78b8; }
  .edition-body :global(p) { margin: 0; }
  .edition-body :global(code) {
    font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.88em;
    background: rgba(20, 17, 13, 0.06);
    padding: 0.05rem 0.3rem;
    border-radius: 2px;
  }
  .edition-step {
    grid-column: 1 / -1;
    grid-row: 3;
    margin-top: 0.5rem;
  }

  .eli5 {
    grid-column: 2;
    margin-top: 2rem;
    max-width: 56ch;
    padding: 1.2rem 1.3rem;
    border-left: 2px solid var(--accent);
    background: rgba(20, 17, 13, 0.04);
  }
  .eli5-label {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: var(--accent);
    margin-bottom: 0.6rem;
  }
  .eli5-body {
    font-family: var(--serif);
    font-weight: 300;
    font-size: clamp(0.95rem, 1.05vw, 1.05rem);
    line-height: 1.55;
    color: var(--ink);
  }

  .ch-next {
    grid-column: 2;
    margin-top: 2.4rem;
    padding: 1.2rem 1.3rem;
    border: 1px solid var(--rule);
    max-width: 56ch;
    background: rgba(20, 17, 13, 0.02);
  }
  .ch-next-label {
    font-family: var(--sans);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: var(--muted);
    margin-bottom: 0.5rem;
  }
  .ch-next-link {
    display: flex;
    align-items: baseline;
    gap: 0.8rem;
    color: var(--ink);
    transition: color 160ms ease;
  }
  .ch-next-link:hover { color: var(--accent); }
  .ch-next-num {
    font-family: var(--sans);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: var(--muted);
  }
  .ch-next-title {
    font-family: var(--serif);
    font-style: italic;
    font-weight: 300;
    font-size: 1.4rem;
    flex: 1;
  }
  .ch-next-arrow { font-family: var(--serif); font-size: 1.4rem; color: var(--accent); }

  .bottom { font-family: var(--sans); }

  .nav {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 2rem;
    border-top: 1px solid var(--rule);
    padding-top: 1.2rem;
    margin-top: 1rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--muted);
    transition: color 180ms ease;
  }
  .nav-link:hover { color: var(--ink); }
  .nav-link.disabled { opacity: 0.35; }
  .nav-link.right { justify-self: end; text-align: right; }

  .arrow { font-family: var(--serif); font-size: 1.4rem; }

  .nav-meta { display: flex; flex-direction: column; gap: 0.15rem; }
  .nav-num { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.24em; }
  .nav-title {
    font-family: var(--serif);
    font-style: italic;
    font-size: 0.95rem;
    color: var(--ink);
  }

  .progress {
    font-size: 0.72rem;
    letter-spacing: 0.24em;
    color: var(--muted);
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
  }
  .progress .divider { color: var(--rule); }
  .ch-progress { color: var(--accent); }

  .drag-hint {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 2px;
    pointer-events: none;
    transition: opacity 140ms ease;
  }
  .drag-hint .bar {
    display: block;
    height: 100%;
    background: var(--accent);
    transform-origin: center;
    transition: transform 80ms linear;
  }

  @media (max-width: 720px) {
    .page { padding: 4vw 7vw; }
    .body {
      grid-template-columns: 1fr;
      gap: 2.5vw;
      padding: 1.5vw 0;
    }
    .number, .title, .gesture, .body-text, .source, .eli5, .ch-next, .steps, .edition-stripe, .tldr, .page-qr, .perspectives {
      grid-column: 1;
      max-width: none;
    }
    .step { padding-left: 0.7rem; }
    .step-code { font-size: 0.78rem; padding: 0.7rem 0.8rem; }
    .title, .gesture, .body-text, .cite, .eli5-body {
      overflow-wrap: break-word;
      word-break: break-word;
      hyphens: auto;
    }
    .number { font-size: clamp(3rem, 12vw, 5rem); margin-top: 0.2rem; }
    .title { font-size: clamp(1.9rem, 7vw, 3rem); }
    .gesture { font-size: clamp(1rem, 3.8vw, 1.2rem); padding-left: 0.9rem; }
    .body-text { padding-left: 0.9rem; }
    .source { padding-left: 0.9rem; }
    .nav { gap: 0.8rem; }
    .ch-dots .dot { width: 1rem; }
    .chapter-meta { gap: 0.5rem; }
    .ch-title { font-size: 0.95rem; }
  }
</style>
