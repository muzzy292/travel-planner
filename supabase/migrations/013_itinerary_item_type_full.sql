-- Drop the old restrictive check constraint and replace with the full set of item types
alter table itinerary_items
  drop constraint if exists itinerary_items_item_type_check;

alter table itinerary_items
  add constraint itinerary_items_item_type_check
  check (item_type in ('flight', 'accommodation', 'activity', 'restaurant', 'transport', 'other'));
