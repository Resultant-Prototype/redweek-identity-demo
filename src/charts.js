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

  const grid = document.createElement('div');
  grid.className = 'chart-grid';
  ['chart-rentals-timeline','chart-rentals-funnel','chart-rentals-repeat',
   'chart-rentals-value','chart-rentals-cancel','chart-rentals-map'].forEach(id => {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `<canvas id="${id}"></canvas>`;
    grid.appendChild(card);
  });
  el.appendChild(grid);

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
    options: { responsive:true, plugins:{ legend:{ display:false } } },
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
        backgroundColor: CONFIG.palette.teal }] },
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

  const grid = document.createElement('div');
  grid.className = 'chart-grid';
  ['chart-resale-timeline','chart-resale-dom','chart-resale-scatter',
   'chart-resale-convrate','chart-resale-buyertype','chart-resale-map'].forEach(id => {
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.innerHTML = `<canvas id="${id}"></canvas>`;
    grid.appendChild(card);
  });
  el.appendChild(grid);

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
        borderColor:CONFIG.palette.teal, backgroundColor:CONFIG.palette.teal+'18', fill:true, tension:0.3, pointRadius:0 }] },
    options:{ responsive:true, plugins:{legend:{display:false}} },
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
