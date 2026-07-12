-- สร้าง schema สำหรับเก็บ table เก่า
CREATE SCHEMA IF NOT EXISTS "archive";

-- เอา table ที่ไม่ได้ใช้ออกจาก realtime publication ก่อน (กันปัญหา)
ALTER PUBLICATION "supabase_realtime" DROP TABLE "public"."map_refresh_trigger";
ALTER PUBLICATION "supabase_realtime" DROP TABLE "public"."phase_logs";

-- ย้าย table ไป archive schema
ALTER TABLE "public"."user_settings" SET SCHEMA "archive";
ALTER TABLE "public"."fight" SET SCHEMA "archive";
ALTER TABLE "public"."leaderboard" SET SCHEMA "archive";
ALTER TABLE "public"."map_refresh_trigger" SET SCHEMA "archive";
ALTER TABLE "public"."moves" SET SCHEMA "archive";
ALTER TABLE "public"."nodes" SET SCHEMA "archive";
ALTER TABLE "public"."phase_logs" SET SCHEMA "archive";
ALTER TABLE "public"."phases" SET SCHEMA "archive";
ALTER TABLE "public"."purchases" SET SCHEMA "archive";
ALTER TABLE "public"."ship" SET SCHEMA "archive";
ALTER TABLE "public"."snapshots" SET SCHEMA "archive";
ALTER TABLE "public"."special_houses" SET SCHEMA "archive";
ALTER TABLE "public"."timer" SET SCHEMA "archive";

-- เช็คยืนยันว่า sequence ย้ายไปจริงไหม
SELECT sequence_schema, sequence_name 
FROM information_schema.sequences 
WHERE sequence_name LIKE '%autorefresh%' 
   OR sequence_name LIKE '%purchases_id%'
   OR sequence_name LIKE '%phase_logs_id%'
   OR sequence_name LIKE '%timer_id%';