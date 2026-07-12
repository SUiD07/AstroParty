SELECT sequence_schema, sequence_name 
FROM information_schema.sequences 
WHERE sequence_name LIKE '%autorefresh%' 
   OR sequence_name LIKE '%purchases_id%'
   OR sequence_name LIKE '%phase_logs_id%'
   OR sequence_name LIKE '%timer_id%';
   