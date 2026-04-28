function populateResortDropdowns() {
  document.querySelectorAll('select[data-filter="resort"]').forEach(sel => {
    CONFIG.resorts.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      sel.appendChild(opt);
    });
  });
}

function renderTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');

  if (tabId === 'owners')   renderOwnersTab();
  if (tabId === 'rentals')  renderRentalsTab();
  if (tabId === 'resale')   renderResaleTab();
  if (tabId === 'identity') renderIdentityTab();

  populateResortDropdowns();
}

function handleFilter(selectEl) {
  const tab    = selectEl.dataset.tab;
  const filter = selectEl.dataset.filter;
  STATE[tab][filter] = selectEl.value;
  renderTab(tab);
}

function resetFilters(tab) {
  Object.keys(STATE[tab]).forEach(k => {
    STATE[tab][k] = k === 'linkedStatus' ? 'linked' : 'all';
  });
  renderTab(tab);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.org-name').textContent = CONFIG.org.tagline;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderTab(btn.dataset.tab));
  });
  populateResortDropdowns();
  renderTab('owners');
});
