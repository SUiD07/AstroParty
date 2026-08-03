create table bidding_timer (
  id int primary key default 1,
  status text not null default 'idle', -- 'idle' | 'input' | 'running'
  duration_seconds int not null default 30,
  end_at timestamptz null,
  updated_at timestamptz not null default now()
);

insert into bidding_timer (id) values (1);

alter publication supabase_realtime add table bidding_timer;