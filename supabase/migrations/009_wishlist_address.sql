-- Add address and coordinates to wishlist items
alter table wishlist_items
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;
