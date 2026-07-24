-- เพิ่ม column สำหรับส่งสัญญาณ "เลื่อนให้ผู้ชมดูคะแนน" จากหน้า /control
-- ไปยังทุกจอ viewer ที่เปิด QuestionModal ค้างอยู่ (เลื่อนไปจุดคะแนนใต้ Canva iframe)
--
-- กลไก: ทุกครั้งที่แอดมินกดปุ่ม จะ increment ค่านี้ขึ้น 1 → broadcast ผ่าน Realtime
-- → ทุกจอ viewer เทียบค่าเก่ากับค่าใหม่ ถ้าไม่เท่ากัน = มีคำสั่งเลื่อนมา → เลื่อนจอให้อัตโนมัติ

alter table presentation_state
  add column scroll_signal integer not null default 0;