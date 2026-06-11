import type { ElementState, GuideElement, LabelQuality } from "./types";

const SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "summary", // <details> disclosure trigger
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="combobox"]',
  '[role="option"]',
  "[onclick]",
  '[contenteditable="true"]',
].join(",");

function trim(s: string | null | undefined): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

/**
 * Truly rendered: has size, not display:none, not visibility:hidden. Note: we
 * do NOT require the element to overlap the current viewport — the AI needs
 * to know about scroll-down content too. Off-viewport elements get
 * `inViewport: false` and are scroll-into-view'd before any click.
 */
function isRendered(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return true;
}

function isInViewport(rect: DOMRect): boolean {
  return !(
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth
  );
}

function resolveLabelledBy(el: HTMLElement): string {
  const ids = el.getAttribute("aria-labelledby");
  if (!ids) return "";
  return ids
    .split(/\s+/)
    .map((id) => trim(document.getElementById(id)?.innerText))
    .filter(Boolean)
    .join(" ");
}

function associatedLabel(el: HTMLElement): string {
  if (
    !(
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    )
  )
    return "";
  // <label for="id">
  const id = el.id;
  if (id) {
    const lbl = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (lbl) return trim(lbl.innerText);
  }
  // wrapping label
  const wrapping = el.closest("label");
  if (wrapping) {
    // exclude the input's own text from the label
    const clone = wrapping.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("input,textarea,select")
      .forEach((n) => n.remove());
    return trim(clone.innerText);
  }
  return "";
}

function nearbyContext(el: HTMLElement): string {
  // closest table row → use first cell text
  const tr = el.closest("tr");
  if (tr) {
    const firstCell = tr.querySelector("td,th");
    if (firstCell) {
      const text = trim((firstCell as HTMLElement).innerText);
      if (text) return `Row: ${text}`;
    }
  }
  // closest heading: walk up looking for a sibling/descendant h1-h6
  let node: HTMLElement | null = el;
  for (let i = 0; i < 6 && node; i++) {
    const heading = findPrecedingHeading(node);
    if (heading) return `Section: ${heading}`;
    node = node.parentElement;
  }
  // closest card/section title via aria-label/aria-labelledby on ancestor
  const labelledAncestor = el.closest<HTMLElement>(
    "[aria-label],[aria-labelledby]"
  );
  if (labelledAncestor && labelledAncestor !== el) {
    const aria = labelledAncestor.getAttribute("aria-label");
    if (aria) return `Section: ${trim(aria)}`;
  }
  return "";
}

function findPrecedingHeading(el: HTMLElement): string {
  // walk through previous siblings up the tree
  let cur: Element | null = el;
  while (cur) {
    let sib: Element | null = cur.previousElementSibling;
    while (sib) {
      if (/^H[1-6]$/.test(sib.tagName)) {
        return trim((sib as HTMLElement).innerText);
      }
      const inner = sib.querySelector<HTMLElement>("h1,h2,h3,h4,h5,h6");
      if (inner) return trim(inner.innerText);
      sib = sib.previousElementSibling;
    }
    cur = cur.parentElement;
  }
  return "";
}

function iconHint(el: HTMLElement): string {
  // only if there's no visible text
  if (trim(el.innerText)) return "";
  const svg = el.querySelector("svg");
  if (svg) {
    const aria = svg.getAttribute("aria-label");
    if (aria) return trim(aria);
    const title = svg.querySelector("title");
    if (title) return trim(title.textContent);
  }
  // icon class hints (font awesome / heroicons / material)
  const iconEl = el.querySelector<HTMLElement>("i,span");
  if (iconEl) {
    const cls = iconEl.className || "";
    const m = cls.match(/(?:fa-|icon-|i-)([\w-]+)/);
    if (m) return m[1].replace(/-/g, " ");
  }
  return "";
}

function position(rect: DOMRect): string {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const horiz = cx < vw / 3 ? "left" : cx > (2 * vw) / 3 ? "right" : "center";
  // off-viewport vertical handling: helps the AI reason about scroll position.
  let vert: string;
  if (rect.bottom < 0) vert = "above viewport (scroll up)";
  else if (rect.top > vh) vert = "below viewport (scroll down)";
  else vert = cy < vh / 3 ? "top" : cy > (2 * vh) / 3 ? "bottom" : "middle";
  return `${vert} ${horiz}`;
}

/**
 * Pull every interaction-relevant piece of state out of an element so the
 * model can reason without guessing. Covers HTML inputs, ARIA widgets, links,
 * and contenteditable. Fields that don't apply stay null.
 */
function extractState(el: HTMLElement): ElementState {
  const role = el.getAttribute("role");
  const ariaChecked = el.getAttribute("aria-checked");
  const ariaPressed = el.getAttribute("aria-pressed");
  const ariaExpanded = el.getAttribute("aria-expanded");
  const ariaSelected = el.getAttribute("aria-selected");

  let value: string | null = null;
  let options: string[] | null = null;
  let checked: boolean | "mixed" | null = null;
  let href: string | null = null;

  if (el instanceof HTMLInputElement) {
    const t = (el.type || "text").toLowerCase();
    if (t === "checkbox" || t === "radio") {
      checked = el.indeterminate ? "mixed" : el.checked;
    } else if (t === "file") {
      value = el.files && el.files.length
        ? Array.from(el.files).map((f) => f.name).join(", ")
        : "";
    } else {
      value = el.value ?? "";
    }
    // <input list="..."> datalist options
    const listId = el.getAttribute("list");
    if (listId) {
      const list = document.getElementById(listId);
      if (list instanceof HTMLDataListElement) {
        options = Array.from(list.options).map((o) => o.value || o.text);
      }
    }
  } else if (el instanceof HTMLTextAreaElement) {
    value = el.value ?? "";
  } else if (el instanceof HTMLSelectElement) {
    if (el.multiple) {
      value = Array.from(el.selectedOptions).map((o) => o.text).join(", ");
    } else {
      value = el.selectedOptions[0]?.text ?? "";
    }
    options = Array.from(el.options).map((o) => o.text);
  } else if (el instanceof HTMLAnchorElement) {
    href = el.getAttribute("href");
  } else if (el.isContentEditable) {
    value = trim(el.textContent);
  }

  // ARIA-driven checkable widgets (role=checkbox|radio|switch)
  if (
    checked === null &&
    ariaChecked != null &&
    (role === "checkbox" ||
      role === "radio" ||
      role === "switch" ||
      role === "menuitemcheckbox" ||
      role === "menuitemradio")
  ) {
    checked =
      ariaChecked === "mixed"
        ? "mixed"
        : ariaChecked === "true";
  }

  const pressed = ariaPressed == null ? null : ariaPressed === "true";
  let expanded: boolean | null =
    ariaExpanded == null ? null : ariaExpanded === "true";
  // <summary> inherits the open state of its parent <details>
  if (expanded === null && el.tagName === "SUMMARY") {
    const parent = el.parentElement;
    if (parent instanceof HTMLDetailsElement) expanded = parent.open;
  }
  const selected = ariaSelected == null ? null : ariaSelected === "true";

  // Disabled: native, ARIA, or readonly text fields
  const disabled =
    (el as HTMLInputElement).disabled === true ||
    el.getAttribute("aria-disabled") === "true" ||
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? el.readOnly
      : false);

  return {
    value,
    options,
    checked,
    pressed,
    expanded,
    selected,
    disabled,
    href,
  };
}

function tagType(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "input") {
    const t = (el as HTMLInputElement).type || "text";
    return `input[${t}]`;
  }
  return tag;
}

export type AutoLabelResult = {
  elements: GuideElement[];
  refMap: Map<string, HTMLElement>;
};

// Cap on elements per harvest. Tall pages (long tables, multi-section forms)
// can easily exceed 500 interactive controls; sending all of them blows up
// the prompt and slows the call. We prioritize in-viewport elements, then
// fill the remaining budget with off-viewport ones in document order.
const HARVEST_LIMIT = 200;

export function harvest(): AutoLabelResult {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>(SELECTOR)
  ).filter(isRendered);

  // Two-pass cap: visible first, then off-viewport — preserves what the user
  // is looking at while still including scroll context.
  const inView: HTMLElement[] = [];
  const offView: HTMLElement[] = [];
  for (const el of all) {
    (isInViewport(el.getBoundingClientRect()) ? inView : offView).push(el);
  }
  const remaining = Math.max(0, HARVEST_LIMIT - inView.length);
  const nodes = [...inView, ...offView.slice(0, remaining)];

  const refMap = new Map<string, HTMLElement>();
  const elements: GuideElement[] = [];
  let autoCounter = 0;

  for (const el of nodes) {
    // skip elements inside the companion's own UI
    if (
      el.closest("[data-companion-panel]") ||
      el.closest("[data-companion-pill]") ||
      el.closest("[data-companion-overlay]")
    ) {
      continue;
    }

    const rect = el.getBoundingClientRect();
    const tagged = el.getAttribute("data-guide-id");
    const ref = tagged || `auto-${++autoCounter}`;
    refMap.set(ref, el);

    // text is the *label* (button copy, link copy, heading). For inputs and
    // selects there is no semantic inner text — the meaningful data lives in
    // `state.value`. Keeping them separate avoids the noisy "all options
    // concatenated" innerText that <select> produces.
    const text =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
        ? ""
        : trim(el.innerText);

    const state = extractState(el);
    const ariaLabel =
      trim(el.getAttribute("aria-label")) ||
      trim(resolveLabelledBy(el)) ||
      trim(el.getAttribute("data-guide-label"));
    const title = trim(el.getAttribute("title"));
    const placeholder = trim(el.getAttribute("placeholder"));
    const altImg = el.querySelector("img")?.getAttribute("alt");
    const alt = trim(altImg);
    const assoc = trim(associatedLabel(el));
    const nearby = trim(nearbyContext(el));
    const icon = iconHint(el);

    // merge alt into ariaLabel if ariaLabel is empty
    const finalAria = ariaLabel || alt || "";
    const finalText = text || assoc || "";

    const strong = !!(finalText || finalAria);
    const weak = !!(title || placeholder || nearby || icon);
    const labelQuality: LabelQuality = strong ? "good" : weak ? "weak" : "none";

    elements.push({
      ref,
      text: finalText,
      ariaLabel: finalAria || null,
      title: title || null,
      placeholder: placeholder || null,
      nearbyText: nearby || icon || null,
      tagType: tagType(el),
      role: el.getAttribute("role"),
      position: position(rect),
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      labelQuality,
      state,
      inViewport: isInViewport(rect),
    });
  }

  return { elements, refMap };
}
