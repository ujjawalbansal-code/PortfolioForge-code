/* ==========================================================================
   PortfolioForge — App Shell Logic
   Talks to the FastAPI backend, drives the 3-step wizard, manages the
   live preview iframe, and exports the final static file.
   ========================================================================== */

// Point this at wherever main.py is running.
const API_BASE = 'https://portfolioforgeapp.onrender.com';

// ---------------------------------------------------------------- state
const state = {
  resumeText: '',
  suggestedSections: [],   // raw SuggestedSection objects from backend
  customSections: [],      // user-added {id, name, description, is_prebuilt:false}
  portfolio: null,         // final Portfolio object from /api/generate-portfolio
};

// ---------------------------------------------------------------- dom refs
const els = {
  gaugeSteps: document.querySelectorAll('.gauge__step'),
  screens: document.querySelectorAll('.screen'),

  // upload
  dropzone: document.getElementById('dropzone'),
  resumeText: document.getElementById('resumeText'),
  fileInput: document.getElementById('fileInput'),
  browseBtn: document.getElementById('browseBtn'),
  filePillWrap: document.getElementById('filePillWrap'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  uploadError: document.getElementById('uploadError'),
  uploadForgeBar: document.getElementById('uploadForgeBar'),

  // sections
  sectionList: document.getElementById('sectionList'),
  addSectionToggle: document.getElementById('addSectionToggle'),
  addSectionForm: document.getElementById('addSectionForm'),
  customSectionName: document.getElementById('customSectionName'),
  customSectionDesc: document.getElementById('customSectionDesc'),
  cancelCustomSection: document.getElementById('cancelCustomSection'),
  confirmCustomSection: document.getElementById('confirmCustomSection'),
  sectionsError: document.getElementById('sectionsError'),
  generateForgeBar: document.getElementById('generateForgeBar'),
  backToUpload: document.getElementById('backToUpload'),
  generateBtn: document.getElementById('generateBtn'),

  // preview
  previewFrame: document.getElementById('previewFrame'),
  warningsBox: document.getElementById('warningsBox'),
  warningsList: document.getElementById('warningsList'),
  backToSections: document.getElementById('backToSections'),
  downloadBtn: document.getElementById('downloadBtn'),
};

// ---------------------------------------------------------------- step nav
function goToStep(n) {
  els.gaugeSteps.forEach(step => {
    const stepNum = Number(step.dataset.step);
    step.classList.toggle('is-active', stepNum === n);
    step.classList.toggle('is-done', stepNum < n);
  });
  els.screens.forEach(screen => screen.classList.remove('is-active'));
  document.getElementById(
    n === 1 ? 'screen-upload' : n === 2 ? 'screen-sections' : 'screen-preview'
  ).classList.add('is-active');
}

function showError(el, message) {
  el.textContent = message;
  el.classList.toggle('is-active', Boolean(message));
}

// ---------------------------------------------------------------- upload screen

els.browseBtn.addEventListener('click', () => els.fileInput.click());

els.fileInput.addEventListener('change', () => {
  const file = els.fileInput.files[0];
  if (file) readTextFile(file);
});

['dragover', 'dragenter'].forEach(evt =>
  els.dropzone.addEventListener(evt, e => {
    e.preventDefault();
    els.dropzone.classList.add('is-drag');
  })
);
['dragleave', 'drop'].forEach(evt =>
  els.dropzone.addEventListener(evt, e => {
    e.preventDefault();
    els.dropzone.classList.remove('is-drag');
  })
);
els.dropzone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) readTextFile(file);
});

function readTextFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    els.resumeText.value = reader.result;
    els.filePillWrap.innerHTML = `<span class="file-pill">✓ ${escapeHtml(file.name)}</span>`;
  };
  reader.readAsText(file);
}

els.analyzeBtn.addEventListener('click', async () => {
  const text = els.resumeText.value.trim();
  showError(els.uploadError, '');

  if (!text) {
    showError(els.uploadError, 'Paste your resume text or upload a .txt file first.');
    return;
  }

  state.resumeText = text;
  setBusy(true, els.uploadForgeBar, els.analyzeBtn, els.browseBtn);

  try {
    const res = await fetch(`${API_BASE}/api/upload-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: text }),
    });
    if (!res.ok) throw new Error((await safeJson(res))?.detail || `Request failed (${res.status})`);

    const data = await res.json(); // SectionSuggestions
    state.suggestedSections = data.sections || [];
    state.customSections = [];
    renderSectionList();
    goToStep(2);
  } catch (err) {
    showError(els.uploadError, err.message || 'Could not analyze resume. Is the backend running?');
  } finally {
    setBusy(false, els.uploadForgeBar, els.analyzeBtn, els.browseBtn);
  }
});

// ---------------------------------------------------------------- sections screen

function renderSectionList() {
  const all = [...state.suggestedSections, ...state.customSections];
  els.sectionList.innerHTML = all.map(sec => `
    <label class="section-card">
      <input type="checkbox" class="section-card__check" data-id="${escapeHtml(sec.id)}" checked />
      <div class="section-card__body">
        <div class="section-card__top">
          <span class="section-card__name">${escapeHtml(sec.name)}</span>
          ${sec.is_prebuilt ? '' : '<span class="tag tag--custom">custom</span>'}
        </div>
        <p class="section-card__desc">${escapeHtml(sec.description)}</p>
      </div>
    </label>
  `).join('');
}

els.addSectionToggle.addEventListener('click', () => {
  els.addSectionForm.classList.add('is-active');
  els.addSectionToggle.style.display = 'none';
  els.customSectionName.focus();
});

els.cancelCustomSection.addEventListener('click', () => closeCustomForm());

function closeCustomForm() {
  els.addSectionForm.classList.remove('is-active');
  els.addSectionToggle.style.display = '';
  els.customSectionName.value = '';
  els.customSectionDesc.value = '';
}

els.confirmCustomSection.addEventListener('click', () => {
  const name = els.customSectionName.value.trim();
  const description = els.customSectionDesc.value.trim();
  if (!name || !description) return;

  const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  state.customSections.push({ id, name, description, is_prebuilt: false });
  renderSectionList();
  closeCustomForm();
});

els.backToUpload.addEventListener('click', () => goToStep(1));

els.generateBtn.addEventListener('click', async () => {
  showError(els.sectionsError, '');

  const checked = [...els.sectionList.querySelectorAll('.section-card__check:checked')]
    .map(cb => cb.dataset.id);
  const all = [...state.suggestedSections, ...state.customSections];
  const selected = all.filter(sec => checked.includes(sec.id));

  if (selected.length === 0) {
    showError(els.sectionsError, 'Select at least one section to build your portfolio.');
    return;
  }

  setBusy(true, els.generateForgeBar, els.generateBtn, els.backToUpload);

  try {
    const res = await fetch(`${API_BASE}/api/generate-portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: state.resumeText, sections: selected }),
    });
    if (!res.ok) throw new Error((await safeJson(res))?.detail || `Request failed (${res.status})`);

    const data = await res.json(); // { portfolio: Portfolio }
    state.portfolio = data.portfolio;
    renderPreview();
    goToStep(3);
  } catch (err) {
    showError(els.sectionsError, err.message || 'Could not generate portfolio. Is the backend running?');
  } finally {
    setBusy(false, els.generateForgeBar, els.generateBtn, els.backToUpload);
  }
});

// ---------------------------------------------------------------- preview screen

function renderPreview() {
  const warnings = state.portfolio?.warnings || [];
  els.warningsList.innerHTML = warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('');
  els.warningsBox.classList.toggle('is-active', warnings.length > 0);

  // Load the static renderer fresh each time, then hand it the data once it's ready.
  els.previewFrame.onload = () => {
    els.previewFrame.contentWindow.renderPortfolio(state.portfolio);
  };
  els.previewFrame.src = 'preview.html?t=' + Date.now();
}

els.backToSections.addEventListener('click', () => goToStep(2));

els.downloadBtn.addEventListener('click', async () => {
  const doc = els.previewFrame.contentDocument;
  if (!doc) return;

  try {
    const html = await buildStandaloneHtml(doc);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed:', err);
  }
});

// Serialize the iframe's rendered document into one portable HTML file:
// inline styles.css so the file has zero external dependencies, and drop
// script.js since the portfolio is already fully rendered into static markup.
async function buildStandaloneHtml(doc) {
  const clone = doc.documentElement.cloneNode(true);

  clone.querySelectorAll('script').forEach(s => s.remove());

  const cssLink = clone.querySelector('link[rel="stylesheet"]');
  if (cssLink) {
    const cssRes = await fetch(new URL(cssLink.getAttribute('href'), doc.baseURI));
    const cssText = await cssRes.text();
    const styleTag = doc.createElement('style');
    styleTag.textContent = cssText;
    cssLink.replaceWith(styleTag);
  }

  return '<!DOCTYPE html>\n' + clone.outerHTML;
}

// ---------------------------------------------------------------- helpers

function setBusy(isBusy, bar, ...buttons) {
  bar.classList.toggle('is-active', isBusy);
  buttons.forEach(btn => (btn.disabled = isBusy));
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
