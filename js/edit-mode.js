// In-browser edit mode. Only loads on localhost — safe to commit & deploy.
// Click the pencil to toggle edit mode. Click any text. Type. Click Save.
// The current HTML file on disk is rewritten.

(function () {
  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '';
  if (!isLocal) return;

  const style = document.createElement('style');
  style.textContent = `
    #edit-toolbar {
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      display: flex; gap: 8px; align-items: center;
      font-family: -apple-system, system-ui, sans-serif; font-size: 13px;
    }
    #edit-toolbar button {
      background: #1a1715; color: #f4efe6; border: 1px solid #1a1715;
      padding: 10px 14px; border-radius: 6px; cursor: pointer;
      font: inherit; letter-spacing: 0.02em;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    #edit-toolbar button.primary { background: #c1272d; border-color: #c1272d; }
    #edit-toolbar button:hover { opacity: 0.88; }
    #edit-toolbar .status { color: #1a1715; background: rgba(244,239,230,0.95);
      padding: 6px 10px; border-radius: 4px; }
    body.editing [contenteditable="true"] {
      outline: 1px dashed rgba(193,39,45,0.45);
      outline-offset: 2px;
    }
    body.editing [contenteditable="true"]:hover {
      outline: 1px solid rgba(193,39,45,0.85);
    }
    body.editing [contenteditable="true"]:focus {
      outline: 2px solid #c1272d;
      background: rgba(255,255,200,0.4);
    }
  `;
  document.head.appendChild(style);

  // Pick every element that's a leaf-ish text node container we want editable.
  // Keep it broad but avoid nav/footer chrome and buttons/forms.
  const EDITABLE_SELECTORS = [
    'h1','h2','h3','h4','h5','h6',
    'p','li','figcaption',
    '.page-label','.section-label','.testimonial-quote','.testimonial-attr',
    '.photo-caption','.hero-kicker','.hero-meta p','.fact-label','.fact-value',
    'blockquote','em','strong','span',
    'div.script-character','div.script-line','div.script-stage-dir','div.script-scene-heading',
  ];

  function activate() {
    document.querySelectorAll(EDITABLE_SELECTORS.join(',')).forEach(el => {
      // Skip anything inside nav / footer / toolbar / forms
      if (el.closest('nav, footer, #edit-toolbar, form, button, a')) return;
      // Skip elements that contain block children (we edit the leaves only)
      if (el.querySelector('h1,h2,h3,h4,h5,h6,p,li,figcaption,form,ul,ol,section,div.card')) return;
      el.setAttribute('contenteditable', 'true');
      el.spellcheck = true;
    });
    document.body.classList.add('editing');
  }

  function deactivate() {
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute('contenteditable');
    });
    document.body.classList.remove('editing');
  }

  async function save() {
    // Strip our toolbar + contenteditable attributes before serializing.
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('#edit-toolbar, #edit-mode-style').forEach(n => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('[spellcheck]').forEach(n => n.removeAttribute('spellcheck'));
    clone.querySelectorAll('.editing').forEach(n => n.classList.remove('editing'));

    const html = '<!DOCTYPE html>\n' + clone.outerHTML;
    let relPath = (location.pathname.split('/').pop() || 'index.html');
    if (!relPath) relPath = 'index.html';
    if (!relPath.endsWith('.html')) relPath += '.html';

    setStatus('saving…');
    try {
      const res = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relPath, html }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'save failed');
      setStatus(`saved ${data.path} · ${data.bytes.toLocaleString()} bytes`);
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setStatus('ERROR: ' + err.message);
    }
  }

  let statusEl;
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  const STORAGE_KEY = 'pis-edit-mode-on';

  function buildToolbar() {
    const bar = document.createElement('div');
    bar.id = 'edit-toolbar';

    const toggle = document.createElement('button');
    toggle.textContent = '✎ Edit';
    toggle.className = 'primary';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save to file';
    saveBtn.style.display = 'none';
    saveBtn.onclick = save;

    function enterEdit() {
      activate();
      toggle.textContent = '✕ Stop editing';
      saveBtn.style.display = 'inline-block';
      localStorage.setItem(STORAGE_KEY, '1');
    }
    function exitEdit() {
      deactivate();
      toggle.textContent = '✎ Edit';
      saveBtn.style.display = 'none';
      localStorage.removeItem(STORAGE_KEY);
    }
    toggle.onclick = () => {
      if (document.body.classList.contains('editing')) exitEdit();
      else enterEdit();
    };

    statusEl = document.createElement('span');
    statusEl.className = 'status';

    bar.append(statusEl, saveBtn, toggle);
    document.body.appendChild(bar);

    // Persist edit mode across page navigations
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      enterEdit();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildToolbar);
  } else {
    buildToolbar();
  }

  // Warn if leaving with unsaved edits
  window.addEventListener('beforeunload', (e) => {
    if (document.body.classList.contains('editing')) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
})();
