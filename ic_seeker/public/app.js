const state = {
  authenticated: false,
  stats: null,
  methodology: null,
  pdfInbox: null,
  professors: [],
  institutions: [],
  rows: [],
  activeId: null,
  activePaper: null,
  resultMeta: null,
  view: 'comfort',
  total: 0
};

const quickTopics = [
  ['ADC', 'adc'],
  ['PLL', 'pll'],
  ['DC-DC', 'dcdc'],
  ['LDO', 'ldo'],
  ['RF', 'rf'],
  ['SerDes', 'serdes'],
  ['SRAM', 'sram'],
  ['Bandgap', 'bandgap']
];

const $ = id => document.getElementById(id);

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function optionList(el, values, label = 'All') {
  el.innerHTML = `<option value="">${label}</option>` + values.map(v => `<option>${escapeHtml(v)}</option>`).join('');
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options
  });
  if (res.status === 401) {
    showLogin('Session expired. Please log in again.');
    throw new Error('Authentication required');
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || text;
    } catch {
      message = text;
    }
    throw new Error(message);
  }
  return await res.json();
}

function showLogin(message = '') {
  state.authenticated = false;
  $('loginScreen').hidden = false;
  $('appShell').hidden = true;
  $('loginError').textContent = message;
  $('password').focus();
}

function showApp() {
  state.authenticated = true;
  $('loginScreen').hidden = true;
  $('appShell').hidden = false;
}

function params() {
  const p = new URLSearchParams();
  for (const id of ['q', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort']) {
    const value = $(id).value.trim();
    if (value) p.set(id, value);
  }
  if ($('hasPdf').checked) p.set('hasPdf', '1');
  if ($('favoriteOnly').checked) p.set('favorite', '1');
  if ($('semantic').checked) p.set('semantic', '1');
  if ($('statusFilter').value) p.set('status', $('statusFilter').value);
  if ($('tagFilter').value) p.set('tag', $('tagFilter').value);
  p.set('limit', '120');
  return p;
}

async function loadStats() {
  const [stats, methodology, pdfInbox, professors, institutions, apiKeys] = await Promise.all([
    api('/api/stats'),
    api('/api/methodology'),
    api('/api/pdf-inbox'),
    api('/api/professors?limit=12&minPapers=2'),
    api('/api/institutions?limit=12&minPapers=2'),
    api('/api/admin/api-keys')
  ]);
  state.stats = stats;
  state.methodology = methodology;
  state.pdfInbox = pdfInbox;
  state.professors = professors;
  state.institutions = institutions;
  $('appTitle').textContent = stats.appName || 'IC Seeker';
  optionList($('venue'), state.stats.venues);
  optionList($('field'), state.stats.fields);
  optionList($('rank'), state.stats.ranks);
  optionList($('tagFilter'), (state.stats.tags || []).map(tag => tag.name));
  $('stats').innerHTML = [
    ['Database rows', fmt(state.stats.total)],
    ['Local PDFs', fmt(state.stats.pdfs)],
    ['Favorites', fmt(state.stats.favorites)],
    ['Notes', fmt(state.stats.notes)],
    ['Year range', `${state.stats.years.minYear || '-'}-${state.stats.years.maxYear || '-'}`]
  ].map(([k, v]) => `<div class="stat-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
  renderApiKeys(apiKeys);
  renderSummary();
  renderCoverage();
  renderPdfInbox();
  renderMethodology();
  renderProfessors();
  renderInstitutions();
}

function renderApiKeys(keys) {
  $('apiKeys').innerHTML = keys.length
    ? keys.map(row => `<div class="key-row"><span>${escapeHtml(row.provider)}</span><strong>${escapeHtml(row.masked)}</strong></div>`).join('')
    : '<p class="hint">No keys saved yet.</p>';
}

function renderSummary() {
  const topVenue = state.stats?.byVenue?.[0];
  const topField = state.stats?.byField?.[0];
  $('summary').innerHTML = [
    ['Papers', fmt(state.total || state.stats?.total)],
    ['Local PDFs', fmt(state.stats?.pdfs)],
    ['Favorites', fmt(state.stats?.favorites)],
    ['Top Venue', topVenue ? `${topVenue.venue} (${fmt(topVenue.count)})` : '-'],
    ['Top Field', topField ? `${topField.field} (${fmt(topField.count)})` : '-']
  ].map(([k, v]) => `<div class="metric"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join('');
}

function renderCoverage() {
  const rows = state.stats?.byVenueYear || [];
  const years = [];
  for (let year = Number($('yearFrom').value || 2016); year <= Number($('yearTo').value || 2026); year++) years.push(year);
  const important = ['ISSCC', 'JSSC', 'VLSI Symposium', 'CICC', 'ASSCC', 'ESSCIRC'];
  const byVenue = new Map();
  for (const row of rows) {
    if (!byVenue.has(row.venue)) byVenue.set(row.venue, new Map());
    byVenue.get(row.venue).set(Number(row.year), Number(row.count));
  }
  $('coverage').innerHTML = `
    <h3>Year coverage</h3>
    ${important.map(venue => {
      const map = byVenue.get(venue) || new Map();
      const filled = years.filter(year => map.get(year));
      return `<div class="coverage-row"><span>${escapeHtml(venue)}</span><strong>${filled.length}/${years.length}</strong></div>`;
    }).join('')}
  `;
}

function renderPdfInbox() {
  const inbox = state.pdfInbox;
  $('pdfInbox').innerHTML = `
    <h3>Local PDF inbox</h3>
    <p>${fmt(inbox?.count)} PDFs waiting</p>
    <code>${escapeHtml(inbox?.path || '')}</code>
    <p class="hint">Drop PDFs here, then run ${escapeHtml(inbox?.importCommand || '')}. DOI or IEEE article number in filename is used for matching.</p>
  `;
}

function renderMethodology() {
  const m = state.methodology;
  const base = m?.scoring?.venueBase || {};
  $('methodology').innerHTML = `
    <h3>Scoring and classification</h3>
    <p><strong>Score:</strong> ${escapeHtml(m?.scoring?.formula || '')}</p>
    <p><strong>Semantic:</strong> local FTS plus IC alias expansion; ready for embedding API later.</p>
    <p><strong>Class:</strong> ${escapeHtml(m?.classification?.[0] || '')}</p>
    <div class="base-list">
      ${Object.entries(base).slice(0, 10).map(([k, v]) => `<span>${escapeHtml(k)} ${escapeHtml(v)}</span>`).join('')}
    </div>
  `;
}

function renderProfessors() {
  $('professors').innerHTML = `
    <h3>Author leaderboard</h3>
    <div class="leader-list">
      ${state.professors.map(row => `
        <div class="leader-row clickable" data-author="${escapeHtml(row.name)}">
          <span title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>
          <strong>${escapeHtml(row.authorScore)}</strong>
          <em>${fmt(row.papers)} papers, ${fmt(row.sPlus)} S+</em>
        </div>
      `).join('')}
    </div>
    <p class="hint">Name-based for now; institution or ORCID disambiguation is the next serious step.</p>
  `;
  document.querySelectorAll('[data-author]').forEach(el => el.addEventListener('click', () => loadAuthor(el.dataset.author)));
}

function renderInstitutions() {
  $('institutions').innerHTML = `
    <h3>Institution leaderboard</h3>
    <div class="leader-list">
      ${state.institutions.map(row => `
        <div class="leader-row clickable" data-institution="${escapeHtml(row.name)}">
          <span title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</span>
          <strong>${escapeHtml(row.institutionScore)}</strong>
          <em>${fmt(row.papers)} papers, ${fmt(row.sPlus)} S+</em>
        </div>
      `).join('')}
    </div>
    <p class="hint">Affiliation strings are source-dependent; school strength gets better with cleaned institution identities.</p>
  `;
  document.querySelectorAll('[data-institution]').forEach(el => el.addEventListener('click', () => loadInstitution(el.dataset.institution)));
}

function renderTopicChips() {
  $('topicChips').innerHTML = quickTopics.map(([label, query]) => (
    `<button class="chip ${$('q').value.trim().toLowerCase() === query ? 'active' : ''}" data-topic="${escapeHtml(query)}" type="button">${escapeHtml(label)}</button>`
  )).join('');
  document.querySelectorAll('[data-topic]').forEach(el => {
    el.addEventListener('click', () => {
      $('q').value = el.dataset.topic;
      $('semantic').checked = true;
      search();
    });
  });
}

function tokenLinks(value, type) {
  const attr = type === 'author' ? 'data-author-link' : 'data-institution-link';
  return String(value || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => `<button class="text-link" ${attr}="${escapeHtml(item)}">${escapeHtml(item)}</button>`)
    .join('<span class="sep">;</span> ') || '-';
}

function renderMiniBars(rows, label = 'count') {
  const max = Math.max(1, ...rows.map(row => Number(row.count || 0)));
  return `<div class="mini-bars">
    ${rows.map(row => `
      <div class="mini-row">
        <span>${escapeHtml(row.key)}</span>
        <div><i style="width:${Math.max(4, Number(row.count || 0) / max * 100)}%"></i></div>
        <strong>${escapeHtml(row.count)} ${escapeHtml(label)}</strong>
      </div>
    `).join('')}
  </div>`;
}

function profilePapers(papers) {
  return `<div class="profile-papers">
    ${papers.slice(0, 80).map(row => `
      <div class="profile-paper" data-id="${row.id}">
        <p>${escapeHtml(row.title)}</p>
        <div class="meta">
          <span class="pill rank">${escapeHtml(row.rank)}</span>
          <span class="pill">${escapeHtml(row.venue)}</span>
          <span class="pill">${escapeHtml(row.field)}</span>
          <span class="pill">${escapeHtml(row.year)}</span>
          <span class="pill">score ${escapeHtml(row.score)}</span>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function bindProfileLinks() {
  document.querySelectorAll('[data-author-link]').forEach(el => el.addEventListener('click', () => loadAuthor(el.dataset.authorLink)));
  document.querySelectorAll('[data-institution-link]').forEach(el => el.addEventListener('click', () => loadInstitution(el.dataset.institutionLink)));
  document.querySelectorAll('.profile-paper').forEach(el => el.addEventListener('click', () => loadPaper(Number(el.dataset.id))));
}

async function loadAuthor(name) {
  const profile = await api(`/api/authors/${encodeURIComponent(name)}`);
  $('detail').innerHTML = `
    <h2>${escapeHtml(profile.name)}</h2>
    <div class="actions">
      <a class="primary" target="_blank" href="${escapeHtml(profile.external.googleScholar)}">Scholar</a>
      <a target="_blank" href="${escapeHtml(profile.external.webSearch)}">Web search</a>
    </div>
    <section class="profile-grid">
      <div class="metric"><span>Author score</span><strong>${escapeHtml(profile.authorScore)}</strong></div>
      <div class="metric"><span>Papers</span><strong>${fmt(profile.papers)}</strong></div>
      <div class="metric"><span>S+ / S / A</span><strong>${fmt(profile.ranks.sPlus)} / ${fmt(profile.ranks.s)} / ${fmt(profile.ranks.a)}</strong></div>
      <div class="metric"><span>Avg score</span><strong>${escapeHtml(profile.avgScore)}</strong></div>
    </section>
    <h3>Yearly strength</h3>${renderMiniBars(profile.byYear, 'papers')}
    <h3>Venues</h3>${renderMiniBars(profile.byVenue, 'papers')}
    <h3>Fields</h3>${renderMiniBars(profile.byDomain, 'papers')}
    <h3>Collaborators</h3>${renderMiniBars(profile.coauthors, 'papers')}
    <h3>Institutions</h3><div class="link-cloud">${tokenLinks(profile.institutions.map(x => x.key).join('; '), 'institution')}</div>
    <h3>Papers</h3>${profilePapers(profile.papers)}
  `;
  bindProfileLinks();
}

async function loadInstitution(name) {
  const profile = await api(`/api/institutions/${encodeURIComponent(name)}`);
  $('detail').innerHTML = `
    <h2>${escapeHtml(profile.name)}</h2>
    <section class="profile-grid">
      <div class="metric"><span>Institution score</span><strong>${escapeHtml(profile.institutionScore)}</strong></div>
      <div class="metric"><span>Papers</span><strong>${fmt(profile.papers)}</strong></div>
      <div class="metric"><span>S+ / S / A</span><strong>${fmt(profile.ranks.sPlus)} / ${fmt(profile.ranks.s)} / ${fmt(profile.ranks.a)}</strong></div>
      <div class="metric"><span>Avg score</span><strong>${escapeHtml(profile.avgScore)}</strong></div>
    </section>
    <h3>Yearly strength</h3>${renderMiniBars(profile.byYear, 'papers')}
    <h3>Venues</h3>${renderMiniBars(profile.byVenue, 'papers')}
    <h3>Fields</h3>${renderMiniBars(profile.byDomain, 'papers')}
    <h3>Authors</h3>${renderMiniBars(profile.authors, 'papers')}
    <h3>Papers</h3>${profilePapers(profile.papers)}
  `;
  bindProfileLinks();
}

async function search() {
  $('results').innerHTML = '<div class="loading">Searching local database...</div>';
  const data = await api(`/api/search?${params().toString()}`);
  state.rows = data.rows;
  state.total = data.total;
  state.resultMeta = data;
  renderSummary();
  renderTopicChips();
  renderResults(data.engine);
}

function renderResults(engine = '') {
  if (!state.rows.length) {
    $('results').innerHTML = '<div class="empty">No papers match the current filters.</div>';
    return;
  }
  const expanded = state.resultMeta?.expandedQuery && state.resultMeta.expandedQuery !== state.resultMeta.query
    ? `<span title="${escapeHtml(state.resultMeta.expandedQuery)}">expanded</span>`
    : '';
  $('results').classList.toggle('compact', state.view === 'compact');
  $('results').innerHTML = `
    <div class="result-head">
      <strong>${fmt(state.total)} matches</strong>
      ${engine ? `<span>${escapeHtml(engine)}</span>` : ''}
      ${expanded}
    </div>
    ${state.rows.map(row => `
      <div class="paper ${row.id === state.activeId ? 'active' : ''}" data-id="${row.id}">
        <p class="paper-title">${row.favorite ? '<span class="star">*</span>' : ''}${escapeHtml(row.title)}</p>
        <div class="meta">
          <span class="pill rank">${escapeHtml(row.rank)}</span>
          <span class="pill">${escapeHtml(row.venue)}</span>
          <span class="pill">${escapeHtml(row.field)}</span>
          <span class="pill">${escapeHtml(row.year)}</span>
          <span class="pill">score ${escapeHtml(row.score)}</span>
          <span class="pill">${escapeHtml(row.readingStatus || 'unread')}</span>
          ${row.localPdf ? '<span class="pill pdf">PDF</span>' : ''}
          ${(row.tags || []).map(tag => `<span class="pill tag">${escapeHtml(tag.name)}</span>`).join('')}
        </div>
      </div>
    `).join('')}
  `;
  document.querySelectorAll('.paper').forEach(el => el.addEventListener('click', () => loadPaper(Number(el.dataset.id))));
}

async function loadPaper(id) {
  state.activeId = id;
  renderResults();
  const paper = await api(`/api/papers/${id}`);
  state.activePaper = paper;
  const pdfHref = paper.local_pdf || paper.pdf_link || '';
  $('detail').innerHTML = `
    <h2>${escapeHtml(paper.title)}</h2>
    <div class="meta">
      <span class="pill rank">${escapeHtml(paper.venue_rank)}</span>
      <span class="pill">${escapeHtml(paper.venue)}</span>
      <span class="pill">${escapeHtml(paper.domain)}</span>
      <span class="pill">${escapeHtml(paper.year)}</span>
      <span class="pill">score ${escapeHtml(paper.quality_score)}</span>
      <span class="pill">${fmt(paper.citation_count)} citations</span>
      <span class="pill">${escapeHtml(paper.verification_status || 'unverified')}</span>
    </div>
    <div class="actions">
      ${paper.doi ? `<a class="primary" target="_blank" href="https://doi.org/${encodeURIComponent(paper.doi)}">Open DOI</a>` : ''}
      ${pdfHref ? `<a target="_blank" href="${escapeHtml(pdfHref)}">Open PDF Link</a>` : ''}
      ${paper.source_url ? `<a target="_blank" href="${escapeHtml(paper.source_url)}">Source</a>` : ''}
    </div>
    <section class="reader-box">
      <label class="check"><input id="paperFavorite" type="checkbox" ${paper.favorite ? 'checked' : ''}><span>Favorite</span></label>
      <label class="field"><span>Status</span>
        <select id="paperStatus">
          ${['unread', 'reading', 'read', 'important', 'skip'].map(x => `<option value="${x}" ${paper.readingStatus === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>Tags</span><input id="paperTags" value="${escapeHtml((paper.tags || []).map(tag => tag.name).join(', '))}" placeholder="adc, must-read"></label>
      <label class="field wide"><span>Notes</span><textarea id="paperNote" placeholder="Your private reading note">${escapeHtml(paper.note || '')}</textarea></label>
      <button class="button primary" id="savePaperState" type="button">Save reading state</button>
      <p class="hint" id="paperStateMsg"></p>
    </section>
    <dl class="detail-grid">
      <dt>Authors</dt><dd>${tokenLinks(paper.authors, 'author')}</dd>
      <dt>DOI</dt><dd>${escapeHtml(paper.doi || '-')}</dd>
      <dt>PDF status</dt><dd>${escapeHtml(paper.download_status || '-')}</dd>
      <dt>Local PDF</dt><dd>${escapeHtml(paper.local_pdf || '-')}</dd>
      <dt>Article no.</dt><dd>${escapeHtml(paper.ieee_article_number || '-')}</dd>
      <dt>Collected by</dt><dd>${escapeHtml(paper.collection_method || '-')}</dd>
      <dt>Affiliations</dt><dd>${tokenLinks(paper.affiliations, 'institution')}</dd>
    </dl>
    <h3>Abstract</h3>
    <div class="abstract">${escapeHtml(paper.abstract || 'No abstract available.')}</div>
  `;
  $('savePaperState').addEventListener('click', savePaperState);
  bindProfileLinks();
}

async function savePaperState() {
  if (!state.activeId) return;
  $('paperStateMsg').textContent = 'Saving...';
  const paper = await api(`/api/private/papers/${state.activeId}/state`, {
    method: 'PUT',
    body: JSON.stringify({
      favorite: $('paperFavorite').checked,
      readingStatus: $('paperStatus').value,
      note: $('paperNote').value,
      tags: $('paperTags').value.split(',').map(x => x.trim()).filter(Boolean)
    })
  });
  state.activePaper = paper;
  $('paperStateMsg').textContent = 'Saved.';
  await loadStats();
  await search();
}

async function importDoi() {
  const doi = $('doiInput').value.trim();
  if (!doi) return;
  $('importStatus').textContent = 'Importing metadata...';
  const paper = await api('/api/import/doi', { method: 'POST', body: JSON.stringify({ doi }) });
  $('importStatus').textContent = `Imported: ${paper.title}`;
  $('doiInput').value = '';
  await loadStats();
  await search();
  await loadPaper(paper.id);
}

async function importManual() {
  $('importStatus').textContent = 'Adding paper...';
  const paper = await api('/api/import/manual', {
    method: 'POST',
    body: JSON.stringify({
      title: $('manualTitle').value,
      authors: $('manualAuthors').value,
      venue: $('manualVenue').value,
      year: $('manualYear').value,
      abstract: $('manualAbstract').value
    })
  });
  $('importStatus').textContent = `Added: ${paper.title}`;
  ['manualTitle', 'manualAuthors', 'manualVenue', 'manualYear', 'manualAbstract'].forEach(id => $(id).value = '');
  await loadStats();
  await search();
  await loadPaper(paper.id);
}

async function saveApiKey() {
  const provider = $('apiProvider').value;
  const value = $('apiValue').value.trim();
  if (!value) return;
  const keys = await api(`/api/admin/api-keys/${encodeURIComponent(provider)}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  });
  $('apiValue').value = '';
  renderApiKeys(keys);
}

function debounce(fn, ms = 250) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}

async function bootApp() {
  showApp();
  await loadStats();
  renderTopicChips();
  const doSearch = debounce(search);
  for (const id of ['q', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort', 'hasPdf', 'favoriteOnly', 'semantic', 'statusFilter', 'tagFilter']) {
    $(id).addEventListener(id === 'q' ? 'input' : 'change', doSearch);
  }
  $('importDoi').addEventListener('click', () => importDoi().catch(err => $('importStatus').textContent = err.message));
  $('importManual').addEventListener('click', () => importManual().catch(err => $('importStatus').textContent = err.message));
  $('saveApiKey').addEventListener('click', () => saveApiKey().catch(err => $('apiKeys').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`));
  $('viewComfort').addEventListener('click', () => setView('comfort'));
  $('viewCompact').addEventListener('click', () => setView('compact'));
  $('logout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST', body: '{}' });
    showLogin('');
  });
  await search();
}

function setView(view) {
  state.view = view;
  $('viewComfort').classList.toggle('active', view === 'comfort');
  $('viewCompact').classList.toggle('active', view === 'compact');
  renderResults(state.resultMeta?.engine || '');
}

async function main() {
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginError').textContent = '';
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
      await bootApp();
    } catch (err) {
      $('loginError').textContent = err.message;
    }
  });
  const auth = await api('/api/auth/status');
  $('loginTitle').textContent = auth.appName || 'IC Seeker Private';
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: '{}'
  }).catch(() => {});
  showLogin('');
}

main().catch(err => {
  showLogin(err.message);
});
