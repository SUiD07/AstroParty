-- ★ Canva Page Presets ("Quick Jump")
-- ใช้เก็บชื่อ+เลขหน้า Canva ที่ใช้บ่อย เช่น "time up" หน้า 100, "buffer" หน้า 101
-- แยกจาก presentation_state เพราะนี่คือรายการที่ผู้ใช้ตั้งเองล่วงหน้า
-- ไม่ใช่ state ของการนำเสนอ ณ ขณะนั้น

create table canva_page_presets (
  id bigint generated always as identity primary key,
  label text not null,
  page_number int not null,
  created_at timestamptz default now()
);

-- (ถ้าโปรเจกต์เปิด RLS ทุก table ไว้ ต้องเพิ่ม policy ให้ด้วย เช่น)
-- alter table canva_page_presets enable row level security;
-- create policy "allow all" on canva_page_presets for all using (true) with check (true);