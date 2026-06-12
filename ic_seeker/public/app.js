const state = {
  stats: null,
  methodology: null,
  pdfInbox: null,
  professors: [],
  institutions: [],
  rows: [],
  activeId: null,
  total: 0
};

const $ = id => document.getElementById(id);

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}

function optionList(el, values, label = 'All') {
  el.innerHTML = `<option value="">${label}</option>` + values.map(v => `<option>${escapeHtml(v)}</option>`).join('');
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

function params() {
  const p = new URLSearchParams();
  for (const id of ['q', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort']) {
    const value = $(id).value.trim();
    if (value) p.set(id, value);
  }
  if ($('hasPdf').checked) p.set('hasPdf', '1');
  p.set('limit', '120');
  return p;
}

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function loadStats() {
  const [stats, methodology, pdfInbox, professors, institutions] = await Promise.all([
    api('/api/stats'),
    api('/api/methodology'),
    api('/api/pdf-inbox'),
    api('/api/professors?limit=12&minPapers=2'),
    api('/api/institutions?limit=12&minPapers=2')
  ]);
  state.stats = stats;
  state.methodology = methodology;
  state.pdfInbox = pdfInbox;
  state.professors = professors;
  state.institutions = institutions;
  optionList($('venue'), state.stats.venues);
  optionList($('field'), state.stats.fields);
  optionList($('rank'), state.stats.ranks);
  $('stats').innerHTML = [
    ['Database rows', fmt(state.stats.total)],
    ['Local PDFs', fmt(state.stats.pdfs)],
    ['Year range', `${state.stats.years.minYear || '-'}-${state.stats.years.maxYear || '-'}`],
    ['CSV', 'ChipSeeker ready']
  ].map(([k, v]) => `<div class="stat-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
  renderSummary();
  renderCoverage();
  renderPdfInbox();
  renderMethodology();
  renderProfessors();
  renderInstitutions();
}

function renderSummary() {
  const topVenue = state.stats?.byVenue?.[0];
  const topField = state.stats?.byField?.[0];
  $('summary').innerHTML = [
    ['Papers', fmt(state.total || state.stats?.total)],
    ['Local PDFs', fmt(state.stats?.pdfs)],
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
      return `<div class="coverage-row">
        <span>${escapeHtml(venue)}</span>
        <strong>${filled.length}/${years.length}</strong>
      </div>`;
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
    <p><strong>Citation:</strong> ${escapeHtml(m?.scoring?.citationBoost || '')}</p>
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
  for (const el of document.querySelectorAll('[data-author]')) {
    el.addEventListener('click', () => loadAuthor(el.dataset.author));
  }
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
    <p class="hint">Affiliation strings are source-dependent; school strength becomes better with IEEE/OpenAlex affiliation coverage.</p>
  `;
  for (const el of document.querySelectorAll('[data-institution]')) {
    el.addEventListener('click', () => loadInstitution(el.dataset.institution));
  }
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
  for (const el of document.querySelectorAll('[data-author-link]')) {
    el.addEventListener('click', () => loadAuthor(el.dataset.authorLink));
  }
  for (const el of document.querySelectorAll('[data-institution-link]')) {
    el.addEventListener('click', () => loadInstitution(el.dataset.institutionLink));
  }
  for (const el of document.querySelectorAll('.profile-paper')) {
    el.addEventListener('click', () => loadPaper(Number(el.dataset.id)));
  }
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
  renderSummary();
  renderResults();
}

function renderResults() {
  if (!state.rows.length) {
    $('results').innerHTML = '<div class="empty">No papers match the current filters.</div>';
    return;
  }
  $('results').innerHTML = state.rows.map(row => `
    <div class="paper ${row.id === state.activeId ? 'active' : ''}" data-id="${row.id}">
      <p class="paper-title">${escapeHtml(row.title)}</p>
      <div class="meta">
        <span class="pill rank">${escapeHtml(row.rank)}</span>
        <span class="pill">${escapeHtml(row.venue)}</span>
        <span class="pill">${escapeHtml(row.field)}</span>
        <span class="pill">${escapeHtml(row.year)}</span>
        <span class="pill">score ${escapeHtml(row.score)}</span>
        ${row.localPdf ? '<span class="pill pdf">PDF</span>' : ''}
      </div>
    </div>
  `).join('');
  for (const el of document.querySelectorAll('.paper')) {
    el.addEventListener('click', () => loadPaper(Number(el.dataset.id)));
  }
}

async function loadPaper(id) {
  state.activeId = id;
  renderResults();
  const paper = await api(`/api/papers/${id}`);
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
    </div>
    <div class="actions">
      ${paper.doi ? `<a class="primary" target="_blank" href="https://doi.org/${encodeURIComponent(paper.doi)}">Open DOI</a>` : ''}
      ${pdfHref ? `<a target="_blank" href="${escapeHtml(pdfHref)}">Open PDF Link</a>` : ''}
      ${paper.source_url ? `<a target="_blank" href="${escapeHtml(paper.source_url)}">Source</a>` : ''}
    </div>
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
  bindProfileLinks();
}

function debounce(fn, ms = 250) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}

async function main() {
  await loadStats();
  const doSearch = debounce(search);
  for (const id of ['q', 'venue', 'field', 'rank', 'yearFrom', 'yearTo', 'sort', 'hasPdf']) {
    $(id).addEventListener(id === 'q' ? 'input' : 'change', doSearch);
  }
  await search();
}

main().catch(err => {
  $('results').innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
});
