-- Accommodation stays
create table accommodations (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  type text default 'Hotel',
  address text,
  check_in_date date,
  check_in_time time,
  check_out_date date,
  check_out_time time,
  confirmation_number text,
  notes text,
  url text,
  price numeric(10,2),
  created_at timestamptz default now()
);

alter table accommodations enable row level security;
create policy "Authenticated users can do everything on accommodations"
  on accommodations for all using (auth.role() = 'authenticated');

-- Timezone on trips
alter table trips add column if not exists timezone text default 'Australia/Sydney';
