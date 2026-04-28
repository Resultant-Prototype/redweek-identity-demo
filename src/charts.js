// charts.js — shared helpers + Tab 1 Owner Portal charts

// ─── renderChoropleth stub (implemented in Task 7) ───────────────────────────
function renderChoropleth(canvasId, customerSubset, title) {
  // implemented in Task 7
}

// ─── Chart registry and shared helpers ───────────────────────────────────────
const _charts = {};
function destroyChart(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

function renderBAN(container, label, value, isLead = false, tooltip = '') {
  const card = document.createElement('div');
  card.className = 'ban-card' + (isLead ? ' lead' : '');
  card.innerHTML = `
    <div class="ban-label">${label}${tooltip ? ` <span class="ban-tip" title="${tooltip}">ⓘ</span>` : ''}</div>
    <div class="ban-value">${value}</div>
  `;
  container.appendChild(card);
}

function renderTeaserBox(container, text) {
  const box = document.createElement('div');
  box.className = 'teaser-box';
  box.innerHTML = `<span class="teaser-icon">🔒</span> ${text}`;
  container.appendChild(box);
}

// ─── renderOwnersTab ──────────────────────────────────────────────────────────
function renderOwnersTab() {
  const el = document.getElementById('tab-owners');
  el.innerHTML = '';

  el.innerHTML += `
    <div class="filter-bar">
      <div class="filter-group">
        <label>Resort</label>
        <select data-filter="resort" data-tab="owners" onchange="handleFilter(this)">
          <option value="all">All Resorts</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Date Range</label>
        <select data-filter="dateRange" data-tab="owners" onchange="handleFilter(this)">
          <option value="year">Full Year</option>
          <option value="90">Last 90 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Owner Type</label>
        <select data-filter="ownerType" data-tab="owners" onchange="handleFilter(this)">
          <option value="all">All Types</option>
          <option value="individual">Individual</option>
          <option value="portfolio">Portfolio</option>
          <option value="broker">Broker</option>
        </select>
      </div>
      <button class="btn-reset" onclick="resetFilters('owners')">Reset</button>
      <button class="btn-export" onclick="exportCSV('owners')">Export</button>
    </div>
  `;

  const rows = filterDaily(DAILY_OWNERS, 'owners');
  const avgActive   = rows.length ? Math.round(rows.reduce((s,r) => s + r.active_listings, 0) / rows.length) : 0;
  const avgDays     = rows.length ? Math.round(rows.reduce((s,r) => s + r.avg_days_listed, 0) / rows.length) : 0;
  const avgVerified = rows.length ? Math.round(rows.reduce((s,r) => s + r.verified_listings / r.active_listings, 0) / rows.length * 100) : 0;
  const avgFee      = rows.length ? Math.round(rows.reduce((s,r) => s + r.avg_maintenance_fee, 0) / rows.length) : 0;
  const avgPriceRed = rows.length ? Math.round(rows.reduce((s,r) => s + r.price_reductions / r.active_listings, 0) / rows.length * 100) : 0;
  const avgDistress = rows.length ? Math.round(rows.reduce((s,r) => s + r.distress_flagged, 0) / rows.length) : 0;

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Active Listings',           avgActive.toLocaleString());
  renderBAN(banGrid, 'Avg Days to Rent',           `${avgDays}d`);
  renderBAN(banGrid, 'Verified Listing Share',     `${avgVerified}%`);
  renderBAN(banGrid, 'Avg Maintenance Fee',        `$${avgFee.toLocaleString()}`);
  renderBAN(banGrid, 'Price Reduction Rate',       `${avgPriceRed}%`);
  renderBAN(banGrid, 'Distress-Flagged (avg/day)', avgDistress.toLocaleString());
  el.appendChild(banGrid);

  const grid = document.createElement('div');
  grid.className = 'chart-grid';
  ['chart-owners-timeline','chart-owners-type','chart-owners-time-to-rent',
   'chart-owners-price-reductions','chart-owners-fees','chart-owners-map'].forEach(id => {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `<canvas id="${id}"></canvas>`;
    grid.appendChild(card);
  });
  el.appendChild(grid);

  renderTeaserBox(el, `Whether an owner is also renting other resorts, purchasing resale, or in financial distress isn't visible from listing data alone. See <strong>Customer Identity</strong> tab.`);

  renderOwnersCharts(rows);
}

// ─── renderOwnersCharts ───────────────────────────────────────────────────────
function renderOwnersCharts(rows) {
  // 1. Active Listings Over Time
  destroyChart('chart-owners-timeline');
  const byDate = {};
  rows.forEach(r => { byDate[r.date] = (byDate[r.date] || 0) + r.active_listings; });
  const dates = Object.keys(byDate).sort();
  _charts['chart-owners-timeline'] = new Chart(
    document.getElementById('chart-owners-timeline'), {
      type: 'line',
      data: {
        labels: dates.filter((_,i) => i % 7 === 0),
        datasets: [{
          label: 'Active Listings',
          data: dates.filter((_,i) => i % 7 === 0).map(d => byDate[d]),
          borderColor: CONFIG.palette.navy,
          backgroundColor: CONFIG.palette.navy + '18',
          fill: true, tension: 0.3, pointRadius: 0,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    }
  );

  // 2. Listings by Owner Type
  destroyChart('chart-owners-type');
  const typeCounts = { individual: 0, portfolio: 0, broker: 0 };
  CUSTOMERS.filter(c => c.owner_type).forEach(c => { typeCounts[c.owner_type]++; });
  _charts['chart-owners-type'] = new Chart(
    document.getElementById('chart-owners-type'), {
      type: 'bar',
      data: {
        labels: ['Individual','Portfolio','Broker'],
        datasets: [{
          data: [typeCounts.individual, typeCounts.portfolio, typeCounts.broker],
          backgroundColor: [CONFIG.palette.navy, CONFIG.palette.blue, CONFIG.palette.slate],
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    }
  );

  // 3. Time to Rent by Resort
  destroyChart('chart-owners-time-to-rent');
  const byResort = {};
  rows.forEach(r => {
    if (!byResort[r.resort]) byResort[r.resort] = [];
    byResort[r.resort].push(r.avg_days_listed);
  });
  const resortLabels = CONFIG.resorts;
  const resortAvgs = resortLabels.map(r => byResort[r] ? Math.round(byResort[r].reduce((a,b)=>a+b,0)/byResort[r].length) : 0);
  _charts['chart-owners-time-to-rent'] = new Chart(
    document.getElementById('chart-owners-time-to-rent'), {
      type: 'bar',
      data: {
        labels: resortLabels,
        datasets: [{ label: 'Avg Days Listed', data: resortAvgs, backgroundColor: CONFIG.palette.blue }],
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } },
    }
  );

  // 4. Price Reduction Frequency by Listing Age
  destroyChart('chart-owners-price-reductions');
  const buckets = ['0–30d','31–60d','61–90d','90+d'];
  const bucketData = [0,0,0,0];
  rows.forEach(r => {
    const idx = r.avg_days_listed <= 30 ? 0 : r.avg_days_listed <= 60 ? 1 : r.avg_days_listed <= 90 ? 2 : 3;
    bucketData[idx] += r.price_reductions;
  });
  _charts['chart-owners-price-reductions'] = new Chart(
    document.getElementById('chart-owners-price-reductions'), {
      type: 'bar',
      data: {
        labels: buckets,
        datasets: [{ label: 'Price Reductions', data: bucketData, backgroundColor: CONFIG.palette.coral }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    }
  );

  // 5. Maintenance Fee by Resort
  destroyChart('chart-owners-fees');
  const feeByResort = resortLabels.map(r => {
    const subset = rows.filter(row => row.resort === r);
    return subset.length ? Math.round(subset.reduce((s,row)=>s+row.avg_maintenance_fee,0)/subset.length) : 0;
  });
  _charts['chart-owners-fees'] = new Chart(
    document.getElementById('chart-owners-fees'), {
      type: 'bar',
      data: {
        labels: resortLabels,
        datasets: [{ label: 'Avg Maintenance Fee ($)', data: feeByResort, backgroundColor: CONFIG.palette.slate }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    }
  );

  // 6. Choropleth (stub called — implemented in Task 7)
  renderChoropleth('chart-owners-map', CUSTOMERS.filter(c => c.owner_id), 'Owner Activity by State');
}
