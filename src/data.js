function deterministicVariance(dateStr, resort, salt = 0) {
  let hash = 0;
  const str = dateStr + resort + salt;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

const START_DATE = new Date('2025-01-01');
const END_DATE   = new Date('2025-12-31');

function dateRange() {
  const dates = [];
  for (let d = new Date(START_DATE); d <= END_DATE; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().slice(0, 10));
  }
  return dates;
}
const DATES = dateRange();

const DAILY_OWNERS = [];
for (const date of DATES) {
  for (const resort of CONFIG.resorts) {
    const v = deterministicVariance(date, resort, 1);
    const v2 = deterministicVariance(date, resort, 2);
    const active = Math.round(180 + v * 120);
    DAILY_OWNERS.push({
      date, resort,
      active_listings:    active,
      new_listings:       Math.round(3 + v * 8),
      delistings:         Math.round(1 + v2 * 5),
      price_reductions:   Math.round(active * (0.05 + v2 * 0.08)),
      avg_listing_price:  Math.round(8000 + v * 12000),
      avg_maintenance_fee: Math.round(1400 + v * 600),
      verified_listings:  Math.round(active * (0.55 + v * 0.25)),
      avg_days_listed:    Math.round(45 + v2 * 60),
      distress_flagged:   Math.round(active * (0.08 + v2 * 0.12)),
    });
  }
}

const DAILY_RENTALS = [];
for (const date of DATES) {
  for (const resort of CONFIG.resorts) {
    const v = deterministicVariance(date, resort, 3);
    const v2 = deterministicVariance(date, resort, 4);
    const inquiries = Math.round(40 + v * 80);
    const bookings  = Math.round(inquiries * (0.18 + v2 * 0.14));
    const completed = Math.round(bookings * (0.85 + v * 0.12));
    DAILY_RENTALS.push({
      date, resort,
      inquiries,
      bookings,
      completed_rentals: completed,
      cancellations:     bookings - completed,
      rental_gmv:        Math.round(completed * (1800 + v * 1200)),
      avg_booking_value: Math.round(1800 + v * 1200),
      avg_lead_time_days: Math.round(14 + v2 * 30),
      traveler_id_rate:  Math.round(60 + v * 25),
    });
  }
}

const DAILY_RESALE = [];
for (const date of DATES) {
  for (const resort of CONFIG.resorts) {
    const v = deterministicVariance(date, resort, 5);
    const v2 = deterministicVariance(date, resort, 6);
    const inquiries = Math.round(8 + v * 20);
    const offers    = Math.round(inquiries * (0.25 + v2 * 0.15));
    const sales     = Math.round(offers * (0.4 + v * 0.25));
    DAILY_RESALE.push({
      date, resort,
      resale_inquiries:      inquiries,
      offers_made:           offers,
      completed_sales:       sales,
      resale_gmv:            Math.round(sales * (9000 + v * 14000)),
      avg_sale_price:        Math.round(9000 + v * 14000),
      avg_days_on_market:    Math.round(55 + v2 * 80),
      avg_discount_to_market: -(Math.round(5 + v * 25)),
    });
  }
}

const SEGMENT_COUNTS = {
  'All Three':           270,
  'Owner+Renter':        540,
  'Renter+Buyer':        600,
  'Owner+Resale':        390,
  'Owner Only':          330,
  'Renter Only':         570,
  'Resale Only':         300,
};

const US_STATES = ['NY','FL','CA','TX','NJ','CT','MA','PA','OH','IL','GA','NC','VA','AZ','CO'];
const STATE_WEIGHTS = [25,12,10,8,6,5,5,4,4,3,3,3,3,3,3];

function weightedState(v) {
  const total = STATE_WEIGHTS.reduce((a,b) => a+b, 0);
  let cumulative = 0;
  const r = v * total;
  for (let i = 0; i < US_STATES.length; i++) {
    cumulative += STATE_WEIGHTS[i];
    if (r <= cumulative) return US_STATES[i];
  }
  return US_STATES[0];
}

const CUSTOMERS = [];
let idx = 0;
for (const [segment, count] of Object.entries(SEGMENT_COUNTS)) {
  for (let i = 0; i < count; i++, idx++) {
    const v  = deterministicVariance(String(idx), segment, 10);
    const v2 = deterministicVariance(String(idx), segment, 11);
    const v3 = deterministicVariance(String(idx), segment, 12);

    const hasOwner  = ['All Three','Owner+Renter','Owner+Resale','Owner Only'].includes(segment);
    const hasRenter = ['All Three','Owner+Renter','Renter+Buyer','Renter Only'].includes(segment);
    const hasResale = ['All Three','Renter+Buyer','Owner+Resale','Resale Only'].includes(segment);
    const isLinked  = segment !== 'Owner Only' && segment !== 'Renter Only' && segment !== 'Resale Only';

    const ownerResort  = hasOwner  ? CONFIG.resorts[Math.floor(v  * CONFIG.resorts.length)] : null;
    const renterResort = hasRenter ? CONFIG.resorts[Math.floor(v2 * CONFIG.resorts.length)] : null;
    const resaleResort = hasResale ? CONFIG.resorts[Math.floor(v3 * CONFIG.resorts.length)] : null;

    const priorRenterFlag = hasResale && hasRenter;
    const rentToBuyMonths = priorRenterFlag ? Math.round(3 + v * 33) : null;

    const rentalSpend = hasRenter ? Math.round(1800 + v2 * 4200) : 0;
    const ownerValue  = hasOwner  ? Math.round(5000 + v  * 15000) : 0;
    const resalePrice = hasResale ? Math.round(8000 + v3 * 16000) : 0;
    const estimatedClv = Math.round((rentalSpend + ownerValue * 0.3 + resalePrice * 0.2) * (isLinked ? 1.4 : 1));

    const linkedSources = [
      hasOwner  ? 'OWNER'  : null,
      hasRenter ? 'RENTAL' : null,
      hasResale ? 'RESALE' : null,
    ].filter(Boolean).join('|');

    CUSTOMERS.push({
      global_customer_id:     isLinked  ? `GC-${String(idx).padStart(6,'0')}` : null,
      owner_id:               hasOwner  ? `OWN-${String(idx).padStart(6,'0')}` : null,
      renter_id:              hasRenter ? `RNT-${String(idx).padStart(6,'0')}` : null,
      resale_id:              hasResale ? `RSL-${String(idx).padStart(6,'0')}` : null,
      linked_sources:         linkedSources,
      match_confidence_score: isLinked  ? Math.round((0.85 + v * 0.14) * 100) / 100 : null,
      owner_listings:         hasOwner  ? Math.round(1 + v * 4)   : null,
      owner_avg_price:        hasOwner  ? Math.round(8000 + v * 12000) : null,
      owner_resort:           ownerResort,
      owner_distress_score:   hasOwner  ? Math.round(v2 * 80)     : null,
      owner_type:             hasOwner  ? (['individual','individual','individual','portfolio','broker'][Math.floor(v3 * 5)]) : null,
      rental_bookings:        hasRenter ? Math.round(1 + v2 * 8)  : null,
      rental_total_spend:     hasRenter ? rentalSpend              : null,
      rental_resort:          renterResort,
      rental_repeat_flag:     hasRenter ? (v2 > 0.35)             : null,
      rental_same_resort_repeat: hasRenter ? (v2 > 0.55)          : null,
      resale_purchased:       hasResale,
      resale_price:           hasResale ? resalePrice              : null,
      resale_resort:          resaleResort,
      prior_renter_flag:      priorRenterFlag,
      rent_to_buy_months:     rentToBuyMonths,
      estimated_clv:          estimatedClv,
      home_state:             weightedState(v),
      customer_segment:       segment,
    });
  }
}
