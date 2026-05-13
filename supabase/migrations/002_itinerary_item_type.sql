alter table itinerary_items add column if not exists item_type text check (item_type in ('flight', 'accommodation'));
