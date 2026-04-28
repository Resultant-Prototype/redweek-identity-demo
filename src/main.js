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
