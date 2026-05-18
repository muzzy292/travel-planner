-- Store Google Places rating on wishlist items
alter table wishlist_items
  add column if not exists google_rating numeric(2,1),
  add column if not exists google_rating_count integer;
