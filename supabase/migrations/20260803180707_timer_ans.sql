create table if not exists answer_timer (
  id int primary key default 1,
  status text not null default 'idle',
  duration_seconds int not null default 0,
  end_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into answer_timer (id, status, duration_seconds, end_at, updated_at)
values (1, 'idle', 0, null, now())
on conflict (id) do nothing;

alter publication supabase_realtime add table answer_timer;