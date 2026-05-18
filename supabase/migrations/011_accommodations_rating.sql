-- Store Google Places rating on accommodation stays
alter table accommodations
  add column if not exists google_rating numeric(2,1),
  add column if not exists google_rating_count integer;
