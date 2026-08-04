alter table bidding_timer add column if not exists remaining_seconds int;
alter table answer_timer add column if not exists remaining_seconds int;