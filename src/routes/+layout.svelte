<script>
  import { onNavigate } from '$app/navigation';
  import { track } from '$lib/track.svelte.js';
  import '../app.css';

  let { children } = $props();

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.track = track.current;
  });

  onNavigate((navigation) => {
    if (typeof document === 'undefined' || !document.startViewTransition) return;

    const fromIdx = orderFromUrl(navigation.from?.url?.pathname);
    const toIdx = orderFromUrl(navigation.to?.url?.pathname);
    const back = fromIdx !== null && toIdx !== null && toIdx < fromIdx;
    document.documentElement.dataset.direction = back ? 'back' : 'forward';

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  function orderFromUrl(path) {
    if (!path) return null;
    if (path === '/' || path === '') return -1;
    const m = path.match(/\/(\d{2,})/);
    return m ? parseInt(m[1], 10) : null;
  }
</script>

{@render children()}
