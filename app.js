(() => {
  const inputWrapper = document.getElementById('input_wrapper');
  const addTagBtn = document.getElementById('add_tag');
  const convertBtn = document.getElementById('xml_convert');
  const output = document.getElementById('output');
  const copyBtn = document.getElementById('clipboard_copy');
  const dlBtn = document.getElementById('download_xml');
  const mdBtn = document.getElementById('markdown_copy');
  const importBtn = document.getElementById('import_XML');
  const fileInput = document.getElementById('xml_file_input');
  const clearAllBtn = document.getElementById('clear_all');
  const htmlCopyBtn = document.getElementById('html_copy');
  const previewToggle = document.getElementById('preview_toggle');
  const htmlOutput = document.getElementById('html_output');

  let tagCounter = 1;

  function nextTagId() {
    tagCounter += 1;
    return `tag_${String(tagCounter).padStart(2, '0')}`;
  }

  function normalizeTagName(raw) {
    if (!raw) return 'unnamed';
    let s = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
    s = s.replace(/[^a-z0-9_:\-\.]/g, '_');
    if (/^[0-9]/.test(s)) s = `x_${s}`;
    if (s.length === 0) s = 'unnamed';
    return s;
  }

  function escapeXml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function createTagElement(name = '', contents = '') {
    const id = nextTagId();
    const wrapper = document.createElement('div');
    wrapper.className = 'prompt-tag';
    wrapper.id = id;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'tag-header';

    const handle = document.createElement('div');
    handle.className = 'reorder-handle';
    handle.textContent = '…';

    const toggle = document.createElement('button');
    toggle.className = 'toggle-collapse';
    toggle.setAttribute('aria-label', 'Collapse or expand');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '▾';

    const inName = document.createElement('input');
    inName.type = 'text';
    inName.className = 'tag_name';
    inName.placeholder = 'Tag name';
    inName.autocomplete = 'off';
    inName.setAttribute('list', 'tag-name-suggestions');
    inName.value = name;

    const ta = document.createElement('textarea');
    ta.className = 'tag_contents';
    ta.placeholder = 'Tag contents';
    ta.autocomplete = 'off';
    ta.value = contents;

    const children = document.createElement('div');
    children.className = 'children';

    const addNested = document.createElement('button');
    addNested.className = 'add_nested_tag';
    addNested.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>Add child tag';

    const del = document.createElement('button');
    del.className = 'del_tag';
    del.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0A48.11 48.11 0 0 1 7.5 5.25m8.25 0c-1.58-.108-3.162-.108-4.742 0m0 0A48.11 48.11 0 0 0 7.5 5.25"/></svg>Delete tag';

    headerDiv.appendChild(handle);
    headerDiv.appendChild(inName);
    headerDiv.appendChild(toggle);
    wrapper.appendChild(headerDiv);
    // wrapper.appendChild(handle);
    // wrapper.appendChild(toggle);
    // wrapper.appendChild(inName);
    wrapper.appendChild(ta);
    wrapper.appendChild(children);
    wrapper.appendChild(addNested);
    wrapper.appendChild(del);

    makeSortable(children);

    // Apply autosize behavior to this textarea
    setupAutosizeTextarea(ta);

    return wrapper;
  }

  // --- Autosize micro-interaction for tag contents ---
  function setHeightAnimated(ta, targetPx) {
    if (!(ta instanceof HTMLTextAreaElement)) return;
    const current = ta.getBoundingClientRect().height;
    ta.style.height = Math.max(0, Math.floor(current)) + 'px';
    const next = Math.max(0, Math.floor(targetPx));
    requestAnimationFrame(() => {
      ta.style.height = next + 'px';
    });
  }

  function setHeightImmediate(ta, targetPx) {
    const prev = ta.style.transition;
    ta.style.transition = 'none';
    ta.style.height = Math.max(0, Math.floor(targetPx)) + 'px';
    // Reflow then restore transition
    void ta.offsetHeight;
    ta.style.transition = prev;
  }

  function collapseToOneLine(ta) {
    if (!(ta instanceof HTMLTextAreaElement)) return;
    const cs = window.getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2 || 16;
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const border = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    const oneLine = Math.ceil(lh + pad + border);
    const baseline = parseFloat(ta.dataset.baseHeightPx || '') || oneLine; // respect initial CSS baseline (e.g., 31px)
    const target = Math.max(oneLine, baseline);
    setHeightAnimated(ta, target);
  }

  function growToContent(ta) {
    if (!(ta instanceof HTMLTextAreaElement)) return;
    // Measure desired height from scrollHeight with height:auto, then animate
    const startPx = ta.getBoundingClientRect().height;
    const prevTransition = ta.style.transition;
    ta.style.transition = 'none';
    ta.style.height = 'auto';
    const desired = ta.scrollHeight;
    // Restore current pixel height before animating
    ta.style.height = Math.max(0, Math.floor(startPx)) + 'px';
    // Force reflow and restore transition
    void ta.offsetHeight;
    ta.style.transition = prevTransition;
    setHeightAnimated(ta, desired);
  }

  function setupAutosizeTextarea(ta) {
    if (!(ta instanceof HTMLTextAreaElement)) return;
    ta.style.overflow = 'hidden';
    // Cache the initial CSS baseline height once
    if (!ta.dataset.baseHeightPx) {
      const initCs = window.getComputedStyle(ta);
      ta.dataset.baseHeightPx = String(parseFloat(initCs.height) || 0);
    }
    ta.addEventListener('focus', () => {
      growToContent(ta);
    });
    ta.addEventListener('input', () => {
      growToContent(ta);
      renderXml();
    });
    ta.addEventListener('blur', () => {
      collapseToOneLine(ta);
      renderXml();
    });
    // Do not override initial CSS baseline height; if already focused, grow
    if (document.activeElement === ta) {
      growToContent(ta);
    }
  }

  function makeSortable(container) {
    if (!container) return;
    Sortable.create(container, {
      group: 'tags',
      handle: '.reorder-handle',
      draggable: '.prompt-tag',
      animation: 150,
      ghostClass: 'drag-ghost',
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onEnd: () => {
        renderXml();
      },
    });
  }

  function makeRootSortable() {
    const rootContainer = inputWrapper.querySelector(':scope > .input_group') || inputWrapper;
    Sortable.create(rootContainer, {
      group: 'tags',
      handle: '.reorder-handle',
      draggable: '.prompt-tag',
      animation: 150,
      ghostClass: 'drag-ghost',
      filter: 'button, input, textarea, .children',
      preventOnFilter: false,
      onEnd: () => {
        renderXml();
      },
    });
  }

  function tagToXml(tagEl, indent = '') {
    const nameRaw = tagEl.querySelector(':scope > .tag-header > .tag_name').value;
    const name = normalizeTagName(nameRaw);
    const text = tagEl.querySelector(':scope > .tag_contents').value;
    const children = Array.from(tagEl.querySelector(':scope > .children').children);

    if (children.length === 0) {
      const body = escapeXml(text || '');
      return `${indent}<${name}>${body}</${name}>`;
    }

    const inner = children
      .filter((el) => el.classList.contains('prompt-tag'))
      .map((child) => tagToXml(child, indent + '  '))
      .join('\n');

    const textPart = text && text.trim().length > 0 ? `\n${indent}  ${escapeXml(text.trim())}\n` : '\n';

    return `${indent}<${name}>${textPart}${inner}\n${indent}</${name}>`;
  }

  function collectRootTags() {
    const rootContainer = inputWrapper.querySelector(':scope > .input_group') || inputWrapper;
    return Array.from(rootContainer.children).filter((el) => el.classList && el.classList.contains('prompt-tag'));
  }

  function renderXml() {
    const roots = collectRootTags();
    if (roots.length === 0) {
      output.innerHTML = '';
      if (htmlOutput) htmlOutput.innerHTML = '';
      return '';
    }
    const xml = roots.map((r) => tagToXml(r, '')).join('\n');
    output.innerHTML = highlightXml(xml);
    if (previewToggle && previewToggle.checked && htmlOutput) {
      htmlOutput.innerHTML = renderHtmlReadable();
    }
    return xml;
  }

  function tagsToMarkdown(tagEl, depth = 2) {
    const name = normalizeTagName(tagEl.querySelector(':scope > .tag-header > .tag_name').value);
    const text = tagEl.querySelector(':scope > .tag_contents').value;
    const children = Array.from(tagEl.querySelector(':scope > .children').children).filter((c) => c.classList.contains('prompt-tag'));

    const hashes = '#'.repeat(Math.min(6, Math.max(1, depth)));
    let md = `${hashes} ${name}`;
    if (text && text.trim()) {
      md += `\n\n${text.trim()}`;
    }
    if (children.length) {
      const kids = children.map((c) => tagsToMarkdown(c, depth + 1)).join('\n\n');
      md += `\n\n${kids}`;
    }
    return md;
  }

  function renderMarkdown() {
    const roots = collectRootTags();
    return roots.map((r) => tagsToMarkdown(r, 2)).join('\n\n');
  }

  function downloadXml(xml) {
    const roots = collectRootTags();
    let data = xml;
    if (roots.length > 1) {
      data = `<prompt>\n${xml}\n</prompt>`;
    }
    const blob = new Blob([data], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.xml';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 0);
  }

  function clearAllTags() {
    const rootContainer = inputWrapper.querySelector(':scope > .input_group') || inputWrapper;
    Array.from(rootContainer.querySelectorAll(':scope > .prompt-tag')).forEach((el) => el.remove());
  }

  function buildFromXmlElement(el) {
    const name = el.tagName;
    const text = (el.childNodes && Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.nodeValue)
      .join('') || '').trim();

    const tagEl = createTagElement(name, text);

    const childrenContainer = tagEl.querySelector(':scope > .children');
    const elementChildren = Array.from(el.children);
    for (const child of elementChildren) {
      const childEl = buildFromXmlElement(child);
      childrenContainer.appendChild(childEl);
    }
    return tagEl;
  }

  function importXmlText(text) {
    const parser = new DOMParser();
    const tryParse = (txt) => parser.parseFromString(txt, 'application/xml');

    // Trim BOM and sanitize bare ampersands which commonly break otherwise-valid content
    const cleaned = String(text)
      .replace(/^\uFEFF/, '')
      .replace(/&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]+;)/g, '&amp;');

    let doc = tryParse(cleaned);
    let parseError = doc.querySelector('parsererror');
    if (parseError) {
      // Attempt a second parse by wrapping multiple top-level nodes in a <prompt> root
      const wrapped = `<prompt>\n${cleaned}\n</prompt>`;
      const doc2 = tryParse(wrapped);
      const parseError2 = doc2.querySelector('parsererror');
      if (parseError2) {
        const msg = parseError2.textContent || parseError.textContent || 'Unknown parse error';
        alert(`Failed to parse XML. Details:\n${msg}`);
        return;
      } else {
        doc = doc2;
      }
    }

    // Guard against selecting an HTML file like index.html
    if (doc.documentElement && doc.documentElement.tagName && doc.documentElement.tagName.toLowerCase() === 'html') {
      alert('The selected file looks like an HTML page, not an XML prompt file. Please choose a .xml file.');
      return;
    }

    clearAllTags();

    let roots = [];
    if (doc.documentElement) {
      const root = doc.documentElement;
      if (root.children.length && root.tagName.toLowerCase() === 'prompt') {
        roots = Array.from(root.children);
      } else if (root.tagName) {
        roots = [root];
      }
    }

    if (roots.length === 0) return;

    for (const el of roots) {
      const built = buildFromXmlElement(el);
      const inputGroup = inputWrapper.querySelector(':scope > .input_group');
      if (inputGroup) {
        inputGroup.appendChild(built);
        continue;
      }
      const anchor = addTagBtn && addTagBtn.closest('.button_group');
      if (anchor && anchor.parentElement === inputWrapper) {
        inputWrapper.insertBefore(built, anchor);
      } else {
        inputWrapper.appendChild(built);
      }
    }
    renderXml();
    attachDatalistToAllTagNames();
  }

  inputWrapper.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains('toggle-collapse')) {
      const tagEl = target.closest('.prompt-tag');
      if (!tagEl) return;
      const isCollapsed = tagEl.classList.toggle('collapsed');
      target.setAttribute('aria-expanded', String(!isCollapsed));
      target.textContent = isCollapsed ? '▸' : '▾';
      renderXml();
    }

    if (target.id === 'add_tag') {
      const tag = createTagElement('', '');
      const inputGroup = inputWrapper.querySelector(':scope > .input_group');
      if (inputGroup) {
        inputGroup.appendChild(tag);
      } else {
        const anchor = addTagBtn && addTagBtn.closest('.button_group');
        if (anchor && anchor.parentElement === inputWrapper) {
          inputWrapper.insertBefore(tag, anchor);
        } else {
          inputWrapper.appendChild(tag);
        }
      }
      renderXml();
      attachDatalistToAllTagNames();
    }

    if (target.classList.contains('add_nested_tag')) {
      const tagEl = target.closest('.prompt-tag');
      if (!tagEl) return;
      const container = tagEl.querySelector(':scope > .children');
      const child = createTagElement('', '');
      container.appendChild(child);
      renderXml();
      attachDatalistToAllTagNames();
    }

    if (target.classList.contains('del_tag')) {
      const tagEl = target.closest('.prompt-tag');
      if (!tagEl) return;
      tagEl.remove();
      renderXml();
    }
  });

  // Autosync on typing
  inputWrapper.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.classList.contains('tag_name') || t.classList.contains('tag_contents')) {
      renderXml();
    }
  });

  if (convertBtn) {
    convertBtn.addEventListener('click', () => {
      renderXml();
    });
  }

  copyBtn.addEventListener('click', async () => {
    const xml = renderXml();
    if (!xml) return;
    try {
      await navigator.clipboard.writeText(xml);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = xml;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  });

  dlBtn.addEventListener('click', () => {
    const xml = renderXml();
    if (!xml) return;
    downloadXml(xml);
  });

  if (mdBtn) {
    mdBtn.addEventListener('click', async () => {
      const md = renderMarkdown();
      if (!md) return;
      try {
        await navigator.clipboard.writeText(md);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = md;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    });
  }

  function tagsToHtmlReadable(tagEl, depth = 2) {
    const name = normalizeTagName(tagEl.querySelector(':scope > .tag-header > .tag_name').value);
    const text = tagEl.querySelector(':scope > .tag_contents').value;
    const children = Array.from(tagEl.querySelector(':scope > .children').children).filter((c) => c.classList.contains('prompt-tag'));

    const level = Math.min(6, Math.max(1, depth));
    let html = `<h${level}>${escapeHtml(name)}</h${level}>`;
    if (text && text.trim()) {
      html += `\n<p>${escapeHtml(text.trim()).replace(/\n/g, '<br>')}</p>`;
    }
    if (children.length) {
      for (const c of children) {
        html += `\n${tagsToHtmlReadable(c, depth + 1)}`;
      }
    }
    return html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderHtmlReadable() {
    const roots = collectRootTags();
    return roots.map((r) => tagsToHtmlReadable(r, 2)).join('\n');
  }

  function highlightXml(xml) {
    const esc = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    let out = '';
    let i = 0;
    while (i < xml.length) {
      const lt = xml.indexOf('<', i);
      if (lt === -1) { out += esc(xml.slice(i)); break; }
      out += esc(xml.slice(i, lt));
      const gt = xml.indexOf('>', lt + 1);
      if (gt === -1) { out += esc(xml.slice(lt)); break; }
      const inner = xml.slice(lt + 1, gt);
      out += '<span class="xml-bracket">&lt;</span>'
           + '<span class="xml-tag-inner">' + esc(inner) + '</span>'
           + '<span class="xml-bracket">&gt;</span>';
      i = gt + 1;
    }
    return out.replace(/\n/g, '<br>');
  }

  async function copyHtml(html) {
    // Prefer async Clipboard API with text/html
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      const blob = new Blob([html], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([html.replace(/<[^>]+>/g, '')], { type: 'text/plain' }) });
      await navigator.clipboard.write([item]);
      return;
    }
    // Fallback using a hidden contentEditable element
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.style.position = 'fixed';
    div.style.left = '-9999px';
    div.innerHTML = html;
    document.body.appendChild(div);
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    sel.removeAllRanges();
    document.body.removeChild(div);
  }

  importBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const text = await file.text();
    importXmlText(text);
  });

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      clearAllTags();
      output.innerHTML = '';
      if (htmlOutput) htmlOutput.innerHTML = '';
    });
  }

  if (htmlCopyBtn) {
    htmlCopyBtn.addEventListener('click', async () => {
      const html = renderHtmlReadable();
      if (!html) return;
      try {
        await copyHtml(html);
      } catch (e) {
        // ignore
      }
    });
  }

  makeRootSortable();
  // Ensure existing child containers (e.g., initial #tag_01 .children) are sortable
  Array.from(inputWrapper.querySelectorAll('.children')).forEach((c) => makeSortable(c));
  // Initial preview
  renderXml();
  // Preview toggle wiring
  if (previewToggle && htmlOutput) {
    const applyPreviewMode = () => {
      if (previewToggle.checked) {
        output.style.display = 'none';
        htmlOutput.style.display = 'block';
        htmlOutput.innerHTML = renderHtmlReadable();
      } else {
        output.style.display = 'block';
        htmlOutput.style.display = 'none';
      }
    };
    previewToggle.addEventListener('change', applyPreviewMode);
    applyPreviewMode();
  }
  // Ensure initial inputs have the datalist attached
  function attachDatalistToAllTagNames() {
    Array.from(document.querySelectorAll('input.tag_name')).forEach((el) => {
      if (el.getAttribute('list') !== 'tag-name-suggestions') {
        el.setAttribute('list', 'tag-name-suggestions');
      }
    });
  }
  attachDatalistToAllTagNames();

  // Ensure initial textareas have autosize behavior
  function attachAutosizeToAllTagContents() {
    Array.from(document.querySelectorAll('textarea.tag_contents')).forEach((el) => {
      setupAutosizeTextarea(el);
    });
  }
  attachAutosizeToAllTagContents();

  function populateTagNameDatalist(options) {
    const dl = document.getElementById('tag-name-suggestions');
    if (!dl) return;
    dl.innerHTML = '';
    (options || []).forEach((opt) => {
      const o = document.createElement('option');
      o.value = String(opt);
      dl.appendChild(o);
    });
  }

  window.refreshTagNameDatalist = function (opts) {
    let list = Array.isArray(opts) ? opts : null;
    if (!list) {
      if (typeof sortedSuggestions !== 'undefined' && Array.isArray(sortedSuggestions)) {
        list = sortedSuggestions;
      }
    }
    if (!list) {
      if (typeof getSortedSuggestions === 'function') {
        try { list = getSortedSuggestions(); } catch (_) {}
      }
    }
    if (!list && typeof suggestions !== 'undefined') {
      try {
        list = Array.isArray(suggestions)
          ? (typeof sortSuggestionsAlphabetically === 'function' ? sortSuggestionsAlphabetically(suggestions) : [...suggestions].sort())
          : [];
      } catch (_) { list = []; }
    }
    populateTagNameDatalist(list || []);
  };

  // Try to populate after the rest of the script (where suggestions may be defined)
  setTimeout(() => { try { window.refreshTagNameDatalist(); } catch (_) {} }, 0);

  // --- Leave-page guard and cache wipe logic ---
  const WIPE_KEY = 'xml_prompt_editor_wipe_on_load';

  function hasAnyContent() {
    const fields = Array.from(inputWrapper.querySelectorAll('input.tag_name, textarea.tag_contents'));
    return fields.some((el) => (el.value || '').trim().length > 0);
  }

  window.addEventListener('beforeunload', (e) => {
    if (!hasAnyContent()) return;
    try { sessionStorage.setItem(WIPE_KEY, '1'); } catch (_) {}
    e.preventDefault();
    e.returnValue = '';
  });

  // If the user cancels the unload, focus remains; clear the wipe flag on focus
  window.addEventListener('focus', () => {
    try { sessionStorage.removeItem(WIPE_KEY); } catch (_) {}
  });

  // On load, if a wipe was requested, clear all input values and preview
  try {
    if (sessionStorage.getItem(WIPE_KEY) === '1') {
      Array.from(inputWrapper.querySelectorAll('input.tag_name')).forEach((el) => { el.value = ''; });
      Array.from(inputWrapper.querySelectorAll('textarea.tag_contents')).forEach((el) => { el.value = ''; });
      output.textContent = '';
      sessionStorage.removeItem(WIPE_KEY);
    }
  } catch (_) {}
})();


// HUMAN MADE
const suggestions = ["Context","Objectives","Category","Example","Item","Question","Answer","Response","Feedback","Output Format"]
let sortedSuggestions = sortSuggestionsAlphabetically(suggestions);

// Utility: sort an array of strings alphabetically (case-insensitive) without mutating the original
function sortSuggestionsAlphabetically(arr) {
  return Array.isArray(arr)
    ? [...arr].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
    : [];
}

// If a global `suggestions` exists, provide a helper to get a sorted copy
if (typeof suggestions !== 'undefined') {
  window.getSortedSuggestions = function () {
    return sortSuggestionsAlphabetically(suggestions);
  };
}