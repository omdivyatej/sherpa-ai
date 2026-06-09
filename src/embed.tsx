/**
 * IIFE entry. Built into a single self-mounting bundle by
 * scripts/build-embed.mjs and served at /dist/companion.js. Drop on any page:
 *
 *   <script
 *     src="https://cdn.jsdelivr.net/npm/cursor-companion-ai/dist/companion.js"
 *     data-anthropic-key="sk-ant-..."
 *     data-context="App description..."
 *   ></script>
 *
 * data-* attributes (all optional except data-anthropic-key for direct mode):
 *   - data-anthropic-key:  Your Anthropic API key.
 *   - data-context:        Plain-English app context.
 *   - data-endpoint:       Proxy URL (used instead of direct Anthropic).
 */
import { mountCompanion } from "./mount";

(function () {
  const script = document.currentScript as HTMLScriptElement | null;

  function init() {
    const confirmAttr = script?.dataset.confirmDestructive;
    mountCompanion({
      anthropicKey: script?.dataset.anthropicKey,
      context: script?.dataset.context,
      endpoint: script?.dataset.endpoint,
      analyticsEndpoint: script?.dataset.analyticsEndpoint,
      confirmDestructiveActions:
        confirmAttr === undefined ? undefined : confirmAttr !== "false",
    });
    if (script?.dataset.anthropicKey) {
      console.warn(
        "[companion] Anthropic API key set via data-anthropic-key. " +
          "This key is exposed to anyone who can view this page's source. " +
          "Only use inside an authenticated host, or set up a server-side proxy via data-endpoint."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
