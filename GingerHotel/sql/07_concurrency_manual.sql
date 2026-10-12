-- MANUAL two-session Oracle integration test, NOT EXECUTED in this delivery.
-- First provision an active WEB_ACCOUNTS record with a real password hash via
-- the backend. Bind its ID as :authenticated_account_id in BOTH worksheets.
-- Do not weaken CK_ACTIVE_PASSWORD or activate seed accounts with fake hashes.

-- SESSION A: lock both rooms and leave this worksheet paused.
SELECT ROOM_ID FROM ROOMS WHERE ROOM_ID=2 FOR UPDATE WAIT 5;
SELECT ROOM_ID FROM ROOMS WHERE ROOM_ID=3 FOR UPDATE WAIT 5;

-- SESSION B: execute the block below while A holds locks.
-- Expected ORA-30006 after WAIT 5, no booking/payment/service rows inserted.
-- SESSION A: execute the same block to finish its booking and COMMIT.
-- SESSION B: execute again after A commits. Expected -20009 ROOM_UNAVAILABLE.
VARIABLE new_booking NUMBER;
BEGIN
  GINGER_API.CREATE_BOOKING(
    p_account=>:authenticated_account_id, p_customer=>1,
    p_check_in=>TRUNC(CAST(SYSTIMESTAMP AT TIME ZONE 'Asia/Bangkok' AS DATE))+7,
    p_check_out=>TRUNC(CAST(SYSTIMESTAMP AT TIME ZONE 'Asia/Bangkok' AS DATE))+9,
    p_guests=>4,p_room_ids=>'[2,3]',p_services=>'[]',p_promotion=>NULL,
    p_expected_total=>6000,p_booking_id=>:new_booking);
END;
/
-- Never leave Session A's preliminary test locks open if abandoning the test:
-- ROLLBACK;
-- Inspect 06_verification.sql afterwards. Repeat with [3,2] as input to verify
-- deterministic lock ordering. Also test cancellation vs new booking and
-- expiry vs proof submission using independent connections.
