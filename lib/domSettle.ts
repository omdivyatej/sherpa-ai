/**
 * Wait until the DOM stops mutating, with a hard ceiling.
 *
 * Use after an autonomous click / value set, instead of a fixed setTimeout.
 * Handles slow-backend cases: if the app's response takes a second to
 * remove a row from the DOM, we wait for that and only THEN re-harvest. If
 * nothing mutates at all (a no-op click), we proceed quickly.
 *
 * Mutations inside the companion's own overlays (highlight ring fading,
 * pill collapsing, status text change) are ignored — otherwise our own UI
 * would keep extending the wait.
 *
 * @param minIdleMs  proceed once the DOM has been quiet for this long
 * @param maxWaitMs  hard ceiling; resolve even if mutations are still firing
 */
export function awaitDomSettle({
  minIdleMs = 200,
  maxWaitMs = 3500,
}: { minIdleMs?: number; maxWaitMs?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      if (idleTimer) clearTimeout(idleTimer);
      clearTimeout(maxTimer);
      resolve();
    };

    const observer = new MutationObserver((mutations) => {
      // Skip mutations originating in companion-owned UI so they don't
      // keep resetting the idle timer.
      const relevant = mutations.some((m) => {
        const target = m.target;
        if (!(target instanceof Element)) return true;
        return !target.closest(
          "[data-companion-panel],[data-companion-pill],[data-companion-overlay]"
        );
      });
      if (!relevant) return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(finish, minIdleMs);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const maxTimer = setTimeout(finish, maxWaitMs);
    // Pessimistic idle timer: if no mutations come in at all, resolve fast.
    idleTimer = setTimeout(finish, minIdleMs);
  });
}
