-- สร้าง table สำหรับควบคุมสไลด์และ jeopardy cell จากแอดมิน (singleton row, id คงที่ = 1)

create table presentation_state (
  id int primary key default 1,
  current_slide int not null default 1,
  highlighted_question_id int references questions(id) on delete set null,
  modal_open boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into presentation_state (id) values (1);

-- เปิด Realtime สำหรับ table นี้
alter publication supabase_realtime add table presentation_state;