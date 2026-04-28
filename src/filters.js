const STATE = {
  owners: {
    resort: 'all',
    dateRange: 'year',
    ownerType: 'all',
    listingStatus: 'all',
  },
  rentals: {
    resort: 'all',
    dateRange: 'year',
    bookingStatus: 'all',
    travelerType: 'all',
  },
  resale: {
    resort: 'all',
    dateRange: 'year',
    buyerType: 'all',
    saleStatus: 'all',
  },
  identity: {
    resort: 'all',
    dateRange: 'year',
    segment: 'all',
    linkedStatus: 'linked',
  },
};

const DATE_PRESETS = {
  year: () => ({ start: new Date('2025-01-01'), end: new Date('2025-12-31') }),
  '90': () => {
    const end = new Date('2025-12-31');
    const start = new Date(end);
    start.setDate(start.getDate() - 90);
    return { start, end };
  },
  '30': () => {
    const end = new Date('2025-12-31');
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    return { start, end };
  },
};

function getDateWindow(dateRange) {
  return (DATE_PRESETS[dateRange] || DATE_PRESETS.year)();
}

function filterDaily(dataset, tab) {
  const s = STATE[tab];
  const { start, end } = getDateWindow(s.dateRange);
  return dataset.filter(row => {
    const d = new Date(row.date);
    if (d < start || d > end) return false;
    if (s.resort !== 'all' && row.resort !== s.resort) return false;
    return true;
  });
}

function filterCustomers() {
  const s = STATE.identity;
  return CUSTOMERS.filter(c => {
    if (s.linkedStatus === 'linked' && !c.global_customer_id) return false;
    if (s.segment === 'top10') {
      const threshold = getTop10Threshold();
      return c.estimated_clv >= threshold;
    }
    if (s.segment === 'single') return !c.global_customer_id;
    return true;
  });
}

function getTop10Threshold() {
  const clvs = CUSTOMERS.filter(c => c.global_customer_id)
    .map(c => c.estimated_clv)
    .sort((a, b) => b - a);
  return clvs[Math.floor(clvs.length * 0.1)] || 0;
}

const fmt = {
  currency: n => '$' + (n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : n.toFixed(0)),
  pct:      n => (n * 100).toFixed(1) + '%',
  num:      n => n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n),
};
