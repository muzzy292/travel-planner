-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Trips
create table trips (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget numeric(10,2),
  created_at timestamptz default now()
);

alter table trips enable row level security;
create policy "Authenticated users can do everything on trips"
  on trips for all using (auth.role() = 'authenticated');

-- Itinerary items
create table itinerary_items (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade,
  day_date date not null,
  title text not null,
  start_time time,
  location text,
  notes text,
  status text default 'tentative' check (status in ('confirmed', 'tentative')),
  order_index integer default 0,
  created_at timestamptz default now()
);

alter table itinerary_items enable row level security;
create policy "Authenticated users can do everything on itinerary_items"
  on itinerary_items for all using (auth.role() = 'authenticated');

-- Wishlist items
create table wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  category text,
  notes text,
  url text,
  added_by text,
  is_favourite boolean default false,
  promoted_to_itinerary_id uuid references itinerary_items(id) on delete set null,
  created_at timestamptz default now()
);

alter table wishlist_items enable row level security;
create policy "Authenticated users can do everything on wishlist_items"
  on wishlist_items for all using (auth.role() = 'authenticated');

-- Expenses
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade,
  amount numeric(10,2) not null,
  category text not null,
  date date not null,
  notes text,
  paid_by text,
  created_at timestamptz default now()
);

alter table expenses enable row level security;
create policy "Authenticated users can do everything on expenses"
  on expenses for all using (auth.role() = 'authenticated');

-- Calendar events
create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade,
  google_event_id text not null,
  item_type text not null check (item_type in ('flight', 'accommodation')),
  item_id uuid,
  synced_at timestamptz default now()
);

alter table calendar_events enable row level security;
create policy "Authenticated users can do everything on calendar_events"
  on calendar_events for all using (auth.role() = 'authenticated');
