// charts.js — shared helpers + Tab 1 Owner Portal charts

// ─── renderChoropleth ─────────────────────────────────────────────────────────
function renderChoropleth(canvasId, customerSubset, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  const div = document.createElement('div');
  div.id = canvasId;
  div.style.width = '100%';
  div.style.height = '220px';
  div.style.position = 'relative';
  parent.replaceChild(div, canvas);

  const counts = {};
  customerSubset.filter(c=>c.home_state).forEach(c=>{ counts[c.home_state]=(counts[c.home_state]||0)+1; });
  const maxVal = Math.max(...Object.values(counts), 1);

  const width = div.clientWidth || 400, height = 220;
  const projection = d3.geoAlbersUsa().fitSize([width, height], { type:'Sphere' });
  const path = d3.geoPath().projection(projection);
  const colorScale = d3.scaleSequentialLog([1, maxVal], [d3.hcl(210,30,95), d3.hcl(220,60,20)]);

  const svg = d3.select(div).append('svg').attr('width',width).attr('height',height);

  fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
    .then(r=>r.json())
    .then(us => {
      const stateNames = {
        '36':'NY','12':'FL','06':'CA','48':'TX','34':'NJ','09':'CT','25':'MA',
        '42':'PA','39':'OH','17':'IL','13':'GA','37':'NC','51':'VA','04':'AZ','08':'CO',
      };
      svg.append('g').selectAll('path')
        .data(topojson.feature(us, us.objects.states).features)
        .join('path')
        .attr('d', path)
        .attr('fill', d => {
          const abbr = stateNames[d.id];
          return counts[abbr] ? colorScale(counts[abbr]) : '#e8edf4';
        })
        .attr('stroke','#fff').attr('stroke-width',0.5)
        .append('title').text(d => {
          const abbr = stateNames[d.id];
          return `${abbr||d.id}: ${(counts[abbr]||0).toLocaleString()} customers`;
        });
    });
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

function infoIcon(tip) {
  return `<span class="chart-info-icon" data-tooltip="${tip}">ⓘ</span>`;
}

function makeChartCard(id, title, tooltip = '') {
  const card = document.createElement('div');
  card.className = 'chart-card';
  card.innerHTML = `<div class="chart-title">${title}${tooltip ? infoIcon(tooltip) : ''}</div><canvas id="${id}"></canvas>`;
  return card;
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

  const timelineWrap = document.createElement('div');
  timelineWrap.className = 'chart-grid';
  timelineWrap.appendChild(makeChartCard('chart-owners-timeline', 'Active Listings Over Time', 'Weekly listing count. Drops indicate seasonal lows or resort-specific expirations.'));
  el.appendChild(timelineWrap);

  const midGrid = document.createElement('div');
  midGrid.className = 'chart-grid chart-grid-4';
  [
    ['chart-owners-type',             'Listings by Owner Type',          'Individual vs. portfolio vs. broker split — portfolio/broker owners price and renew differently.'],
    ['chart-owners-time-to-rent',     'Days to Rent by Resort',          'Average days a listing sits before booking. High values signal pricing or demand gaps.'],
    ['chart-owners-price-reductions', 'Price Reductions by Listing Age', 'How often owners cut prices as listings age — a leading indicator of distress or overpricing.'],
    ['chart-owners-fees',             'Avg Maintenance Fee by Resort',   'Mean annual maintenance cost per resort. High fees correlate with slower listing velocity.'],
  ].forEach(([id, title, tip]) => midGrid.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(midGrid);

  const mapWrap = document.createElement('div');
  mapWrap.className = 'chart-grid';
  mapWrap.appendChild(makeChartCard('chart-owners-map', 'Owner Home State', 'Where owners live — useful for targeted outreach and regional marketing.'));
  el.appendChild(mapWrap);

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
      options: { responsive: true, aspectRatio: 5, plugins: { legend: { display: false } } },
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

// ─── renderRentalsTab ─────────────────────────────────────────────────────────
function renderRentalsTab() {
  const el = document.getElementById('tab-rentals');
  el.innerHTML = '';

  el.innerHTML += `<div class="filter-bar">
    <div class="filter-group"><label>Resort</label>
      <select data-filter="resort" data-tab="rentals" onchange="handleFilter(this)">
        <option value="all">All Resorts</option>
      </select></div>
    <div class="filter-group"><label>Date Range</label>
      <select data-filter="dateRange" data-tab="rentals" onchange="handleFilter(this)">
        <option value="year">Full Year</option><option value="90">Last 90 Days</option><option value="30">Last 30 Days</option>
      </select></div>
    <button class="btn-reset" onclick="resetFilters('rentals')">Reset</button>
    <button class="btn-export" onclick="exportCSV('rentals')">Export</button>
  </div>`;

  const rows = filterDaily(DAILY_RENTALS, 'rentals');
  const totalGMV    = rows.reduce((s,r) => s + r.rental_gmv, 0);
  const totalInq    = rows.reduce((s,r) => s + r.inquiries, 0);
  const totalBook   = rows.reduce((s,r) => s + r.bookings, 0);
  const totalCancel = rows.reduce((s,r) => s + r.cancellations, 0);
  const inqToBook   = totalInq ? Math.round(totalBook / totalInq * 100) : 0;
  const cancelRate  = totalBook ? Math.round(totalCancel / totalBook * 100) : 0;
  const avgLead     = rows.length ? Math.round(rows.reduce((s,r)=>s+r.avg_lead_time_days,0)/rows.length) : 0;
  const avgTravId   = rows.length ? Math.round(rows.reduce((s,r)=>s+r.traveler_id_rate,0)/rows.length) : 0;
  const repeatRate  = Math.round(CUSTOMERS.filter(c=>c.rental_repeat_flag).length / CUSTOMERS.filter(c=>c.renter_id).length * 100);

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Total Rental GMV',         `$${(totalGMV/1e6).toFixed(1)}M`);
  renderBAN(banGrid, 'Inquiry-to-Booking Rate',  `${inqToBook}%`);
  renderBAN(banGrid, 'Repeat Renter Rate',        `${repeatRate}%`);
  renderBAN(banGrid, 'Cancellation Rate',         `${cancelRate}%`);
  renderBAN(banGrid, 'Avg Lead Time',             `${avgLead}d`);
  renderBAN(banGrid, 'Ultimate Traveler ID Rate', `${avgTravId}%`, true, 'Bookings where end traveler identity was confirmed vs. total bookings.');
  el.appendChild(banGrid);

  const timelineWrap = document.createElement('div');
  timelineWrap.className = 'chart-grid';
  timelineWrap.appendChild(makeChartCard('chart-rentals-timeline', 'Completed Rentals Over Time', 'Weekly rental completions. Seasonal peaks align with school holidays and resort peak seasons.'));
  el.appendChild(timelineWrap);

  const midGrid = document.createElement('div');
  midGrid.className = 'chart-grid chart-grid-4';
  [
    ['chart-rentals-funnel', 'Inquiry-to-Booking by Resort',  'What share of inquiries convert to completed bookings, by resort. Low rates signal friction or pricing mismatches.'],
    ['chart-rentals-repeat', 'Repeat vs. First-Time Renters', 'Repeat renters have 2–3× higher lifetime value. Without identity resolution, repeat visits across devices are invisible.'],
    ['chart-rentals-value',  'Avg Rental Value by Resort',    'Mean rental transaction size. High-value resorts warrant premium owner support and pricing guidance.'],
    ['chart-rentals-cancel', 'Cancellation Trend',            'Weekly cancellation rate. Spikes often signal inventory-demand mismatches or policy friction.'],
  ].forEach(([id, title, tip]) => midGrid.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(midGrid);

  const mapWrap = document.createElement('div');
  mapWrap.className = 'chart-grid';
  mapWrap.appendChild(makeChartCard('chart-rentals-map', 'Renter Home State', 'Where renters travel from — informs regional marketing and resort recommendations.'));
  el.appendChild(mapWrap);

  renderTeaserBox(el, `Whether a renter comes back, books the same resort twice, or converts to ownership — none of that is visible from rental data alone. See <strong>Customer Identity</strong> tab.`);
  renderRentalsCharts(rows);
}

// ─── renderRentalsCharts ──────────────────────────────────────────────────────
function renderRentalsCharts(rows) {
  // 1. Bookings Over Time
  destroyChart('chart-rentals-timeline');
  const byDate = {};
  rows.forEach(r => { byDate[r.date] = (byDate[r.date]||0) + r.completed_rentals; });
  const dates = Object.keys(byDate).sort();
  _charts['chart-rentals-timeline'] = new Chart(document.getElementById('chart-rentals-timeline'), {
    type: 'line',
    data: { labels: dates.filter((_,i)=>i%7===0),
      datasets: [{ label: 'Completed Rentals', data: dates.filter((_,i)=>i%7===0).map(d=>byDate[d]),
        borderColor: CONFIG.palette.blue, backgroundColor: CONFIG.palette.blue+'18', fill:true, tension:0.3, pointRadius:0 }] },
    options: { responsive:true, aspectRatio: 5, plugins:{ legend:{ display:false } } },
  });

  // 2. Inquiry→Booking Funnel by Resort
  destroyChart('chart-rentals-funnel');
  const byResort = {};
  rows.forEach(r => {
    if (!byResort[r.resort]) byResort[r.resort] = { inq:0, book:0 };
    byResort[r.resort].inq  += r.inquiries;
    byResort[r.resort].book += r.completed_rentals;
  });
  _charts['chart-rentals-funnel'] = new Chart(document.getElementById('chart-rentals-funnel'), {
    type: 'bar',
    data: { labels: CONFIG.resorts,
      datasets: [
        { label:'Inquiries',         data: CONFIG.resorts.map(r=>byResort[r]?.inq||0),  backgroundColor: CONFIG.palette.gray2 },
        { label:'Completed Rentals', data: CONFIG.resorts.map(r=>byResort[r]?.book||0), backgroundColor: CONFIG.palette.blue },
      ] },
    options: { responsive:true, indexAxis:'y' },
  });

  // 3. Repeat vs First-Time Renters by Resort
  destroyChart('chart-rentals-repeat');
  const repeatByResort = {};
  const firstByResort  = {};
  CUSTOMERS.filter(c=>c.rental_resort).forEach(c => {
    if (c.rental_repeat_flag) repeatByResort[c.rental_resort] = (repeatByResort[c.rental_resort]||0)+1;
    else                      firstByResort[c.rental_resort]  = (firstByResort[c.rental_resort]||0)+1;
  });
  _charts['chart-rentals-repeat'] = new Chart(document.getElementById('chart-rentals-repeat'), {
    type:'bar',
    data:{ labels: CONFIG.resorts,
      datasets:[
        { label:'Repeat',     data: CONFIG.resorts.map(r=>repeatByResort[r]||0), backgroundColor: CONFIG.palette.navy },
        { label:'First-Time', data: CONFIG.resorts.map(r=>firstByResort[r]||0),  backgroundColor: CONFIG.palette.gray2 },
      ] },
    options:{ responsive:true },
  });

  // 4. Avg Booking Value by Resort
  destroyChart('chart-rentals-value');
  const valueByResort = {};
  rows.forEach(r => {
    if (!valueByResort[r.resort]) valueByResort[r.resort] = [];
    valueByResort[r.resort].push(r.avg_booking_value);
  });
  _charts['chart-rentals-value'] = new Chart(document.getElementById('chart-rentals-value'), {
    type:'bar',
    data:{ labels: CONFIG.resorts,
      datasets:[{ label:'Avg Booking Value ($)',
        data: CONFIG.resorts.map(r => valueByResort[r] ? Math.round(valueByResort[r].reduce((a,b)=>a+b,0)/valueByResort[r].length) : 0),
        backgroundColor: CONFIG.palette.blue }] },
    options:{ responsive:true, plugins:{ legend:{ display:false } } },
  });

  // 5. Cancellation Rate by Lead Time bucket
  destroyChart('chart-rentals-cancel');
  const ltBuckets = ['0–7d','8–14d','15–30d','31–60d','60+d'];
  const ltCancel  = [0,0,0,0,0];
  const ltTotal   = [0,0,0,0,0];
  rows.forEach(r => {
    const i = r.avg_lead_time_days<=7?0:r.avg_lead_time_days<=14?1:r.avg_lead_time_days<=30?2:r.avg_lead_time_days<=60?3:4;
    ltCancel[i]+=r.cancellations; ltTotal[i]+=r.bookings;
  });
  _charts['chart-rentals-cancel'] = new Chart(document.getElementById('chart-rentals-cancel'), {
    type:'bar',
    data:{ labels: ltBuckets,
      datasets:[{ label:'Cancel Rate %',
        data: ltBuckets.map((_,i)=>ltTotal[i]?Math.round(ltCancel[i]/ltTotal[i]*100):0),
        backgroundColor: CONFIG.palette.coral }] },
    options:{ responsive:true, plugins:{ legend:{ display:false } } },
  });

  // 6. Map
  renderChoropleth('chart-rentals-map', CUSTOMERS.filter(c=>c.renter_id), 'Renter Origin by State');
}

// ─── renderResaleTab ──────────────────────────────────────────────────────────
function renderResaleTab() {
  const el = document.getElementById('tab-resale');
  el.innerHTML = '';

  el.innerHTML += `<div class="filter-bar">
    <div class="filter-group"><label>Resort</label>
      <select data-filter="resort" data-tab="resale" onchange="handleFilter(this)">
        <option value="all">All Resorts</option>
      </select></div>
    <div class="filter-group"><label>Date Range</label>
      <select data-filter="dateRange" data-tab="resale" onchange="handleFilter(this)">
        <option value="year">Full Year</option><option value="90">Last 90</option><option value="30">Last 30</option>
      </select></div>
    <button class="btn-reset" onclick="resetFilters('resale')">Reset</button>
    <button class="btn-export" onclick="exportCSV('resale')">Export</button>
  </div>`;

  const rows = filterDaily(DAILY_RESALE, 'resale');
  const totalGMV    = rows.reduce((s,r)=>s+r.resale_gmv,0);
  const totalInq    = rows.reduce((s,r)=>s+r.resale_inquiries,0);
  const totalSales  = rows.reduce((s,r)=>s+r.completed_sales,0);
  const convRate    = totalInq ? Math.round(totalSales/totalInq*100) : 0;
  const avgDOM      = rows.length ? Math.round(rows.reduce((s,r)=>s+r.avg_days_on_market,0)/rows.length) : 0;
  const avgDiscount = rows.length ? Math.round(rows.reduce((s,r)=>s+r.avg_discount_to_market,0)/rows.length) : 0;
  const resaleBuyers = CUSTOMERS.filter(c=>c.resale_purchased);
  const priorRenterShare = resaleBuyers.length ? Math.round(resaleBuyers.filter(c=>c.prior_renter_flag).length/resaleBuyers.length*100) : 0;
  const liquidityIndex = totalSales && rows.length ? Math.round(totalSales / rows.length * 10) / 10 : 0;

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Total Resale GMV',       `$${(totalGMV/1e6).toFixed(1)}M`);
  renderBAN(banGrid, 'Resale Conversion Rate', `${convRate}%`);
  renderBAN(banGrid, 'Avg Days on Market',     `${avgDOM}d`);
  renderBAN(banGrid, 'Avg Discount to Market', `${avgDiscount}%`);
  renderBAN(banGrid, 'Prior Renter Share',     `${priorRenterShare}%`, true, 'Resale buyers who were previously renters on the platform — only visible via identity resolution.');
  renderBAN(banGrid, 'Resort Liquidity Index', liquidityIndex.toFixed(1));
  el.appendChild(banGrid);

  const timelineWrap = document.createElement('div');
  timelineWrap.className = 'chart-grid';
  timelineWrap.appendChild(makeChartCard('chart-resale-timeline', 'Resale Volume Over Time', 'Weekly completed resale sales. Slow periods may indicate pricing resistance or low inventory quality.'));
  el.appendChild(timelineWrap);

  const midGrid = document.createElement('div');
  midGrid.className = 'chart-grid chart-grid-4';
  [
    ['chart-resale-dom',      'Days on Market by Resort',         'How long resale listings take to close. Long days-on-market suggests overpricing or low buyer demand.'],
    ['chart-resale-scatter',  'Discount vs. Days on Market',      'Do sellers who discount more close faster? This chart shows the relationship between pricing aggressiveness and velocity.'],
    ['chart-resale-convrate', 'Conversion Rate by Resort',        'Inquiry-to-sale rate per resort. Low rates signal pricing or buyer confidence gaps.'],
    ['chart-resale-buyertype','Prior Renter Share of Buyers',     'Share of resale buyers who were previously renters on this platform — only visible via P3RL identity resolution.'],
  ].forEach(([id, title, tip]) => midGrid.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(midGrid);

  const mapWrap = document.createElement('div');
  mapWrap.className = 'chart-grid';
  mapWrap.appendChild(makeChartCard('chart-resale-map', 'Buyer Home State', 'Where resale buyers are located — useful for targeted outreach and geo-targeted campaigns.'));
  el.appendChild(mapWrap);

  renderTeaserBox(el, `How many resale buyers came through the rental funnel first? What drove conversion? The answer lives in the <strong>Customer Identity</strong> tab.`);
  renderResaleCharts(rows);
}

// ─── renderResaleCharts ───────────────────────────────────────────────────────
function renderResaleCharts(rows) {
  // 1. Resale Volume Over Time
  destroyChart('chart-resale-timeline');
  const byDate = {};
  rows.forEach(r=>{ byDate[r.date]=(byDate[r.date]||0)+r.completed_sales; });
  const dates = Object.keys(byDate).sort();
  _charts['chart-resale-timeline'] = new Chart(document.getElementById('chart-resale-timeline'), {
    type:'line',
    data:{ labels:dates.filter((_,i)=>i%7===0),
      datasets:[{ label:'Completed Sales', data:dates.filter((_,i)=>i%7===0).map(d=>byDate[d]),
        borderColor:CONFIG.palette.slate, backgroundColor:CONFIG.palette.slate+'18', fill:true, tension:0.3, pointRadius:0 }] },
    options:{ responsive:true, aspectRatio: 5, plugins:{legend:{display:false}} },
  });

  // 2. Days on Market by Resort
  destroyChart('chart-resale-dom');
  const domByResort={};
  rows.forEach(r=>{ if(!domByResort[r.resort])domByResort[r.resort]=[]; domByResort[r.resort].push(r.avg_days_on_market); });
  _charts['chart-resale-dom'] = new Chart(document.getElementById('chart-resale-dom'), {
    type:'bar', data:{
      labels:CONFIG.resorts,
      datasets:[{ label:'Avg Days on Market',
        data:CONFIG.resorts.map(r=>domByResort[r]?Math.round(domByResort[r].reduce((a,b)=>a+b,0)/domByResort[r].length):0),
        backgroundColor:CONFIG.palette.slate }]},
    options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}}},
  });

  // 3. Sale Price vs Comp scatter
  destroyChart('chart-resale-scatter');
  const scatterData = CUSTOMERS.filter(c=>c.resale_purchased&&c.resale_price).map(c=>({
    x: c.resale_price,
    y: Math.round(c.resale_price * (1 + (c.owner_distress_score||30)/200)),
  }));
  _charts['chart-resale-scatter'] = new Chart(document.getElementById('chart-resale-scatter'), {
    type:'scatter', data:{ datasets:[{
      label:'Sale Price vs Market Comp',
      data: scatterData.slice(0,200),
      backgroundColor: CONFIG.palette.blue+'88', pointRadius:4 }]},
    options:{ responsive:true, scales:{
      x:{title:{display:true,text:'Sale Price ($)'}},
      y:{title:{display:true,text:'Est. Market Comp ($)'}},
    }},
  });

  // 4. Conversion Rate by Resort
  destroyChart('chart-resale-convrate');
  const crByResort={};
  rows.forEach(r=>{
    if(!crByResort[r.resort])crByResort[r.resort]={inq:0,sales:0};
    crByResort[r.resort].inq+=r.resale_inquiries; crByResort[r.resort].sales+=r.completed_sales;
  });
  _charts['chart-resale-convrate'] = new Chart(document.getElementById('chart-resale-convrate'), {
    type:'bar', data:{
      labels:CONFIG.resorts,
      datasets:[{ label:'Conversion Rate %',
        data:CONFIG.resorts.map(r=>crByResort[r]&&crByResort[r].inq?Math.round(crByResort[r].sales/crByResort[r].inq*100):0),
        backgroundColor:CONFIG.palette.navy }]},
    options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}}},
  });

  // 5. Prior Renter vs New-to-File stacked bar by resort
  destroyChart('chart-resale-buyertype');
  const priorByResort={}, newByResort={};
  CUSTOMERS.filter(c=>c.resale_purchased&&c.resale_resort).forEach(c=>{
    if(c.prior_renter_flag) priorByResort[c.resale_resort]=(priorByResort[c.resale_resort]||0)+1;
    else                    newByResort[c.resale_resort]=(newByResort[c.resale_resort]||0)+1;
  });
  _charts['chart-resale-buyertype'] = new Chart(document.getElementById('chart-resale-buyertype'), {
    type:'bar', data:{
      labels:CONFIG.resorts,
      datasets:[
        { label:'🔒 Prior Renter (requires identity resolution)',
          data:CONFIG.resorts.map(r=>priorByResort[r]||0), backgroundColor:CONFIG.palette.teal },
        { label:'New-to-File',
          data:CONFIG.resorts.map(r=>newByResort[r]||0),   backgroundColor:CONFIG.palette.gray2 },
      ]},
    options:{responsive:true,scales:{x:{stacked:true},y:{stacked:true}}},
  });

  // 6. Map
  renderChoropleth('chart-resale-map', CUSTOMERS.filter(c=>c.resale_purchased), 'Resale Activity by State');
}

// ─── renderIdentityTab ────────────────────────────────────────────────────────
function renderIdentityTab() {
  const el = document.getElementById('tab-identity');
  el.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'match-banner';
  banner.innerHTML = `
    <div class="match-headline">${CONFIG.scale.linkedAccounts.toLocaleString()} customers linked across Owner Portal, Rental Marketplace &amp; Resale</div>
    <div class="match-stats">
      <span>Match confidence: <strong>${CONFIG.scale.matchConfidence}%</strong></span>
      <span>Owner-only: <strong>${(CONFIG.scale.ownerOnly/1000).toFixed(0)}K</strong></span>
      <span>Renter-only: <strong>${(CONFIG.scale.renterOnly/1000).toFixed(0)}K</strong></span>
      <span>Resale-only: <strong>${(CONFIG.scale.resaleOnly/1000).toFixed(0)}K</strong></span>
      <span>Traveler ID Rate: <strong>${CONFIG.scale.travelerIdRate}%</strong></span>
    </div>
  `;
  el.appendChild(banner);

  el.innerHTML += `<div class="filter-bar">
    <div class="filter-group"><label>Resort</label>
      <select data-filter="resort" data-tab="identity" onchange="handleFilter(this)">
        <option value="all">All Resorts</option>
      </select></div>
    <div class="filter-group"><label>Segment</label>
      <select data-filter="segment" data-tab="identity" onchange="handleFilter(this)">
        <option value="all">All Linked</option>
        <option value="top10">Top 10% CLV</option>
        <option value="single">Single-Source Only</option>
      </select></div>
    <div class="filter-group"><label>Linked Status</label>
      <select data-filter="linkedStatus" data-tab="identity" onchange="handleFilter(this)">
        <option value="linked">Linked Only</option>
        <option value="all">All</option>
      </select></div>
    <button class="btn-reset" onclick="resetFilters('identity')">Reset</button>
    <button class="btn-export" onclick="exportCSV('identity')">Export</button>
  </div>`;

  const customers = filterCustomers();
  const linked    = customers.filter(c=>c.global_customer_id);
  const avgCLV    = linked.length ? Math.round(linked.reduce((s,c)=>s+c.estimated_clv,0)/linked.length) : 0;
  const ownerRenterOverlap = CUSTOMERS.filter(c=>c.owner_id&&c.renter_id).length;
  const totalOwners        = CUSTOMERS.filter(c=>c.owner_id).length;
  const ownerRenterPct     = totalOwners ? Math.round(ownerRenterOverlap/totalOwners*100) : 0;
  const resaleBuyers       = CUSTOMERS.filter(c=>c.resale_purchased);
  const rentToBuyPct       = resaleBuyers.length ? Math.round(resaleBuyers.filter(c=>c.prior_renter_flag).length/resaleBuyers.length*100) : 0;
  const travId             = CONFIG.scale.travelerIdRate;

  const banGrid = document.createElement('div');
  banGrid.className = 'ban-grid';
  renderBAN(banGrid, 'Cross-Platform CLV / Linked Customer', `$${avgCLV.toLocaleString()}`, true, 'Avg estimated lifetime value per customer across all linked data sources — owners, renters, and resale buyers.');
  renderBAN(banGrid, 'Owner-to-Renter Overlap',   `${ownerRenterPct}%`, false, 'Owners who also rent other properties — dual-role participants with the highest retention rates.');
  renderBAN(banGrid, 'Rent-to-Buy Conversion',    `${rentToBuyPct}%`,   false, 'Renters who later purchased a resale timeshare. Only visible by linking rental and resale records via P3RL.');
  renderBAN(banGrid, 'Traveler ID Rate',           `${travId}%`,         false, 'Share of bookings where the actual end traveler was identified, not just the booking agent or primary account holder.');
  renderBAN(banGrid, 'Total Linked Customers',     `${(CONFIG.scale.linkedAccounts/1e6).toFixed(2)}M`, false, 'Unique individuals matched across Owner Portal, Rental Marketplace, and Resale using P3RL identity resolution.');
  renderBAN(banGrid, 'Avg Match Confidence',       `${CONFIG.scale.matchConfidence}%`, false, 'Weighted average confidence score across all cross-source identity links. 91% indicates high-quality matching with low false-positive risk.');
  el.appendChild(banGrid);

  // Row 1: Sankey (2/3) + Venn (1/3)
  const row1 = document.createElement('div');
  row1.className = 'chart-grid-3col';

  const sankeyCard = document.createElement('div');
  sankeyCard.className = 'chart-card';
  sankeyCard.innerHTML = `
    <div class="chart-title">Rent-to-Buy Conversion Path${infoIcon('How renters move through the resale funnel. 18% convert — a pipeline only visible after P3RL links rental and resale records.')}</div>
    <div id="chart-identity-sankey" style="width:100%;height:260px;"></div>
    <div class="sankey-subtitle">18% of eligible renters converted to resale ownership — invisible without identity resolution</div>
  `;
  row1.appendChild(sankeyCard);

  const vennCard = document.createElement('div');
  vennCard.className = 'chart-card';
  vennCard.innerHTML = `<div class="chart-title">Customer Population Overlap${infoIcon('Customers appearing across Owner Portal, Rental Marketplace, and Resale. The center represents highest-CLV multi-platform participants.')}</div><div id="chart-identity-venn"></div>`;
  row1.appendChild(vennCard);
  el.appendChild(row1);

  // Row 2: CLV scatter + Single vs Linked
  const row2 = document.createElement('div');
  row2.className = 'chart-grid chart-grid-2';
  [
    ['chart-identity-clv',    'CLV Distribution by Customer Segment', 'Estimated lifetime value by identity segment. Cross-platform linked customers show significantly higher CLV than single-source customers.'],
    ['chart-identity-linked', 'Linked vs. Single-Source by Resort',   'Per-resort breakdown of linked vs. single-source customers. Linked customers generate more bookings and higher transaction value.'],
  ].forEach(([id, title, tip]) => row2.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(row2);

  // Row 3: geo bar + map
  const row3 = document.createElement('div');
  row3.className = 'chart-grid chart-grid-2';
  [
    ['chart-identity-geo', 'Top States — Linked Customers',   'Geographic concentration of P3RL-linked customers by state. Informs regional marketing prioritization.'],
    ['chart-identity-map', 'Home State of Linked Customers',  'Where P3RL-linked customers live — enables precision geo-targeting across all three platforms.'],
  ].forEach(([id, title, tip]) => row3.appendChild(makeChartCard(id, title, tip)));
  el.appendChild(row3);

  renderIdentityCharts(customers);
}

// ─── renderIdentityCharts ─────────────────────────────────────────────────────
function renderIdentityCharts(customers) {
  // 1. Sankey
  const sankeyEl = document.getElementById('chart-identity-sankey');
  sankeyEl.innerHTML = '';
  const width  = sankeyEl.clientWidth  || 500;
  const height = sankeyEl.clientHeight || 260;

  const svg = d3.select(sankeyEl).append('svg').attr('width',width).attr('height',height);

  const sankeyLayout = d3.sankey()
    .nodeWidth(20)
    .nodePadding(16)
    .extent([[1,1],[width-1,height-1]]);

  const graph = {
    nodes: [
      { name: `All Renters\n${(CONFIG.scale.totalRenters/1000).toFixed(0)}K` },
      { name: `Researched Resale\n${(CONFIG.scale.sankeyResearched/1000).toFixed(0)}K` },
      { name: `Made Offer\n${(CONFIG.scale.sankeyOffered/1000).toFixed(0)}K` },
      { name: `Purchased\n${(CONFIG.scale.renterConvertedResale/1000).toFixed(0)}K` },
      { name: `Did Not Convert\n${((CONFIG.scale.totalRenters-CONFIG.scale.renterConvertedResale)/1000).toFixed(0)}K` },
    ],
    links: [
      { source:0, target:1, value: CONFIG.scale.sankeyResearched },
      { source:0, target:4, value: CONFIG.scale.totalRenters - CONFIG.scale.sankeyResearched },
      { source:1, target:2, value: CONFIG.scale.sankeyOffered },
      { source:1, target:4, value: CONFIG.scale.sankeyResearched - CONFIG.scale.sankeyOffered },
      { source:2, target:3, value: CONFIG.scale.renterConvertedResale },
      { source:2, target:4, value: CONFIG.scale.sankeyOffered - CONFIG.scale.renterConvertedResale },
    ],
  };

  sankeyLayout(graph);

  const nodeColors = [CONFIG.palette.navy, CONFIG.palette.blue, CONFIG.palette.blue, CONFIG.palette.teal, CONFIG.palette.gray2];

  svg.append('g').selectAll('rect')
    .data(graph.nodes).join('rect')
    .attr('x', d=>d.x0).attr('y', d=>d.y0)
    .attr('width', d=>d.x1-d.x0).attr('height', d=>d.y1-d.y0)
    .attr('fill', (_,i)=>nodeColors[i]||CONFIG.palette.slate)
    .append('title').text(d=>d.name);

  svg.append('g').attr('fill','none').selectAll('path')
    .data(graph.links).join('path')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', d => d.target.index===3 ? CONFIG.palette.teal : CONFIG.palette.gray2)
    .attr('stroke-width', d=>Math.max(1,d.width))
    .attr('opacity', 0.5)
    .append('title').text(d=>`${d.source.name} → ${d.target.name}: ${d.value.toLocaleString()}`);

  svg.append('g').style('font','10px sans-serif').selectAll('text')
    .data(graph.nodes).join('text')
    .attr('x', d=>d.x0<width/2 ? d.x1+6 : d.x0-6)
    .attr('y', d=>(d.y1+d.y0)/2).attr('dy','0.35em')
    .attr('text-anchor', d=>d.x0<width/2?'start':'end')
    .text(d=>d.name.split('\n')[0])
    .style('fill', CONFIG.palette.navy).style('font-weight','600');

  // 2. Venn — custom D3 SVG (3-circle)
  const linkedC     = customers.filter(c => c.global_customer_id);
  const ow = c => !!c.owner_id, re = c => !!c.renter_id, rs = c => !!c.resale_id;
  const ownerOnly    = linkedC.filter(c =>  ow(c) && !re(c) && !rs(c)).length;
  const renterOnly   = linkedC.filter(c => !ow(c) &&  re(c) && !rs(c)).length;
  const resaleOnly   = linkedC.filter(c => !ow(c) && !re(c) &&  rs(c)).length;
  const ownerRenter  = linkedC.filter(c =>  ow(c) &&  re(c) && !rs(c)).length;
  const ownerResale  = linkedC.filter(c =>  ow(c) && !re(c) &&  rs(c)).length;
  const renterResale = linkedC.filter(c => !ow(c) &&  re(c) &&  rs(c)).length;
  const allThreeCount= linkedC.filter(c =>  ow(c) &&  re(c) &&  rs(c)).length;

  const vennEl = document.getElementById('chart-identity-venn');
  vennEl.innerHTML = '';
  const W = vennEl.clientWidth || 300, H = 250;
  const cx = W / 2, r = 72;
  // Equilateral-ish triangle: Owners top-left, Renters top-right, Resale bottom
  const OC  = { x: cx - 52, y: 88 };
  const RC  = { x: cx + 52, y: 88 };
  const RSC = { x: cx,      y: 170 };

  const vennSvg = d3.select(vennEl).append('svg').attr('width', W).attr('height', H);

  [[OC, '#1B2A4A'], [RC, '#2E618F'], [RSC, '#5B7FA6']].forEach(([c, col]) => {
    vennSvg.append('circle')
      .attr('cx', c.x).attr('cy', c.y).attr('r', r)
      .attr('fill', col).attr('fill-opacity', 0.18)
      .attr('stroke', col).attr('stroke-width', 1.5);
  });

  const txt = (x, y, text, size = 11, bold = false, col = '#111827') =>
    vennSvg.append('text')
      .attr('x', x).attr('y', y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', size).attr('font-family', "'Inter', system-ui, sans-serif")
      .attr('font-weight', bold ? 700 : 500).attr('fill', col)
      .text(text);

  // Circle labels
  txt(cx - 108, 52,  'Owners',  11, true, '#1B2A4A');
  txt(cx + 108, 52,  'Renters', 11, true, '#2E618F');
  txt(cx,       240, 'Resale',  11, true, '#5B7FA6');

  // Region counts
  txt(cx - 95,  88,  ownerOnly.toLocaleString());
  txt(cx + 95,  88,  renterOnly.toLocaleString());
  txt(cx,       220, resaleOnly.toLocaleString());
  txt(cx,       62,  ownerRenter.toLocaleString());
  txt(cx - 50,  138, ownerResale.toLocaleString());
  txt(cx + 50,  138, renterResale.toLocaleString());
  txt(cx,       112, allThreeCount.toLocaleString(), 13, true);

  // 3. CLV by Segment scatter with tier mean lines
  destroyChart('chart-identity-clv');
  const SCATTER_SEGS = ['Owner Only','Renter Only','Resale Only','Owner+Renter','Renter+Buyer','All Three'];
  const segColors = [CONFIG.palette.gray,CONFIG.palette.gray,CONFIG.palette.gray2,
                     CONFIG.palette.blue,CONFIG.palette.blue,CONFIG.palette.teal];

  const scatterDatasets = SCATTER_SEGS.map((seg, si) => ({
    type: 'scatter',
    label: seg,
    data: customers.filter(c=>c.customer_segment===seg)
      .map((c,j) => ({ x: si + ((j%11)-5)*0.055, y: c.estimated_clv })),
    backgroundColor: segColors[si]+'55',
    pointRadius: 3,
    order: 1,
  }));

  function tierMean(segs) {
    const sub = customers.filter(c=>segs.includes(c.customer_segment));
    return sub.length ? Math.round(sub.reduce((s,c)=>s+c.estimated_clv,0)/sub.length) : 0;
  }
  const singleMean = tierMean(['Owner Only','Renter Only','Resale Only']);
  const linkedMean = tierMean(['Owner+Renter','Renter+Buyer','All Three']);
  const meanDatasets = [
    { type:'line', label:`Single-source mean $${singleMean.toLocaleString()}`,
      data:[{x:-0.4,y:singleMean},{x:2.4,y:singleMean}],
      borderColor:CONFIG.palette.coral, borderWidth:2, borderDash:[6,3], pointRadius:0, order:0 },
    { type:'line', label:`Linked mean $${linkedMean.toLocaleString()}`,
      data:[{x:2.6,y:linkedMean},{x:5.4,y:linkedMean}],
      borderColor:CONFIG.palette.teal, borderWidth:2, borderDash:[6,3], pointRadius:0, order:0 },
  ];

  _charts['chart-identity-clv'] = new Chart(document.getElementById('chart-identity-clv'), {
    type: 'scatter',
    data: { datasets: [...scatterDatasets, ...meanDatasets] },
    options: {
      responsive: true,
      scales: {
        x: {
          min: -0.5, max: 5.5,
          ticks: { stepSize:1, callback: val => SCATTER_SEGS[Math.round(val)] || '' },
          grid: { display:false },
        },
        y: { title:{ display:true, text:'Estimated CLV ($)' } },
      },
      plugins: {
        legend: { display:true, position:'bottom', labels:{ boxWidth:12, font:{size:10} } },
      },
    },
  });

  // 4. Single-Source vs Linked by Resort
  destroyChart('chart-identity-linked');
  const linkedByResort = {};
  const singleByResort = {};
  CUSTOMERS.forEach(c => {
    const resort = c.owner_resort||c.rental_resort||c.resale_resort;
    if (!resort) return;
    if (c.global_customer_id) linkedByResort[resort]=(linkedByResort[resort]||0)+1;
    else                      singleByResort[resort]=(singleByResort[resort]||0)+1;
  });
  _charts['chart-identity-linked'] = new Chart(document.getElementById('chart-identity-linked'), {
    type:'bar',
    data:{ labels:CONFIG.resorts,
      datasets:[
        { label:'Linked',        data:CONFIG.resorts.map(r=>linkedByResort[r]||0), backgroundColor:CONFIG.palette.teal },
        { label:'Single-Source', data:CONFIG.resorts.map(r=>singleByResort[r]||0), backgroundColor:CONFIG.palette.gray2 },
      ]},
    options:{responsive:true,scales:{x:{stacked:true},y:{stacked:true}}},
  });

  // 5. Top 10 States geo bar
  destroyChart('chart-identity-geo');
  const stateCounts={};
  customers.filter(c=>c.global_customer_id&&c.home_state).forEach(c=>{stateCounts[c.home_state]=(stateCounts[c.home_state]||0)+1;});
  const top10 = Object.entries(stateCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  _charts['chart-identity-geo'] = new Chart(document.getElementById('chart-identity-geo'), {
    type:'bar',
    data:{ labels:top10.map(([s])=>s), datasets:[{ label:'Linked Customers',
      data:top10.map(([,v])=>v), backgroundColor:CONFIG.palette.navy }]},
    options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}}},
  });

  // 6. Choropleth
  renderChoropleth('chart-identity-map', customers.filter(c=>c.global_customer_id), 'Linked Customer Distribution');
}
