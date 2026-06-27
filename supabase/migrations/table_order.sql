-- 1. ENUMS (cleaner than free-text)

-- Session status
create type table_session_status as enum (
  'pending',
  'active',
  'closed'
);

-- Seat status
create type seat_status as enum (
  'open',
  'claimed'
);

-- Order status (extend later if needed)
create type order_status as enum (
  'placed',
  'preparing',
  'served',
  'completed',
  'cancelled'
);

-- 2. restaurant_tables
create table restaurant_tables (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references restaurants(id) on delete cascade,

  table_number int not null,
  table_token text not null unique,

  is_active boolean default true,

  created_at timestamptz default now(),

  unique (restaurant_id, table_number)
);

-- 3. table_sessions
create table table_sessions (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references restaurants(id) on delete cascade,

  table_id uuid not null
    references restaurant_tables(id) on delete cascade,

  status table_session_status not null default 'pending',

  host_name text,
  join_code text, -- 4 digit code

  created_at timestamptz default now(),
  activated_at timestamptz,
  closed_at timestamptz
);

-- IMPORTANT INDEX (only 1 active session per table)
create unique index one_active_session_per_table
on table_sessions(table_id)
where status = 'active';

-- 4. table_seats
create table table_seats (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null
    references table_sessions(id) on delete cascade,

  seat_number int not null,

  status seat_status not null default 'open',

  claimed_name text,
  device_id text,
  claimed_at timestamptz,

  created_at timestamptz default now(),

  unique (session_id, seat_number)
);

-- IMPORTANT INDEX (device cannot claim multiple seats)
create unique index one_seat_per_device_per_session
on table_seats(session_id, device_id)
where device_id is not null;

-- 5. Modify orders table
create table orders (
  id uuid primary key default gen_random_uuid(),

  restaurant_id uuid not null
    references restaurants(id) on delete cascade,

  table_id uuid
    references restaurant_tables(id) on delete set null,

  table_session_id uuid
    references table_sessions(id) on delete set null,

  seat_id uuid
    references table_seats(id) on delete set null,

  status order_status default 'placed',

  total_amount numeric,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES (for performance)
create index idx_orders_table_session
on orders(table_session_id);

create index idx_orders_seat
on orders(seat_id);

create index idx_sessions_table
on table_sessions(table_id);

create index idx_seats_session
on table_seats(session_id);

-- Prevent claiming without device_id
alter table table_seats
add constraint device_required_if_claimed
check (
  (status = 'open') OR
  (status = 'claimed' AND device_id is not null)
);

-- Prevent invalid timestamps
alter table table_sessions
add constraint valid_session_times
check (
  activated_at is null OR activated_at >= created_at
);

-- 7. Auto-create seats when session activated (optional trigger)
create or replace function create_seats_for_session()
returns trigger as $$
begin
  if NEW.status = 'active' and OLD.status != 'active' then
    
    -- create 4 seats (you can make dynamic later)
    insert into table_seats (session_id, seat_number)
    select NEW.id, generate_series(1, 4);

  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trigger_create_seats
after update on table_sessions
for each row
execute function create_seats_for_session();

