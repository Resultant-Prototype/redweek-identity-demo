function exportCSV(tab) {
  let rows, filename, fields;
  if (tab === 'owners') {
    rows = filterDaily(DAILY_OWNERS, 'owners');
    filename = 'owner_portal_export.csv';
    fields = ['date','resort','active_listings','new_listings','price_reductions','avg_listing_price','avg_maintenance_fee','verified_listings','avg_days_listed','distress_flagged'];
  } else if (tab === 'rentals') {
    rows = filterDaily(DAILY_RENTALS, 'rentals');
    filename = 'rental_marketplace_export.csv';
    fields = ['date','resort','inquiries','bookings','completed_rentals','cancellations','rental_gmv','avg_booking_value','avg_lead_time_days','traveler_id_rate'];
  } else if (tab === 'resale') {
    rows = filterDaily(DAILY_RESALE, 'resale');
    filename = 'resale_marketplace_export.csv';
    fields = ['date','resort','resale_inquiries','offers_made','completed_sales','resale_gmv','avg_sale_price','avg_days_on_market','avg_discount_to_market'];
  } else {
    rows = filterCustomers();
    filename = 'customer_identity_export.csv';
    fields = ['global_customer_id','linked_sources','match_confidence_score','customer_segment','estimated_clv','home_state','owner_resort','rental_resort','resale_resort','prior_renter_flag','rent_to_buy_months'];
  }

  const header = fields.join(',');
  const body = rows.map(r => fields.map(f => JSON.stringify(r[f]??'')).join(',')).join('\n');
  const blob = new Blob([header+'\n'+body], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
