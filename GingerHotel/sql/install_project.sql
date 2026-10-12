-- Oracle SQL Developer: open this file from sql/ and Run Script (F5).
-- Run only in a NEW EMPTY educational schema. DDL cannot be rolled back.
-- This runner refuses existing hotel tables and stops before seeding invalid packages.
SET DEFINE OFF;
SET SERVEROUTPUT ON;
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK;
DECLARE v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM USER_TABLES WHERE TABLE_NAME IN
    ('CUSTOMERS','EMPLOYEES','ROOM_TYPES','ROOMS','BOOKINGS','SERVICES','PROMOTIONS','WEB_ACCOUNTS');
  IF v_count>0 THEN RAISE_APPLICATION_ERROR(-20900,'Hotel tables already exist; use a new empty schema.'); END IF;
END;
/
@@00_original_schema.sql
@@02_proposed_migration.sql
@@04_transactions.sql
@@08_admin_transactions.sql
-- CREATE PACKAGE may report a warning instead of an SQL error: explicitly fail.
DECLARE v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM USER_ERRORS WHERE ATTRIBUTE='ERROR';
  IF v_count>0 THEN RAISE_APPLICATION_ERROR(-20901,'Compilation errors: inspect USER_ERRORS before continuing.'); END IF;
  SELECT COUNT(*) INTO v_count FROM USER_OBJECTS
    WHERE OBJECT_NAME IN ('GINGER_API','GINGER_MANAGEMENT') AND OBJECT_TYPE IN ('PACKAGE','PACKAGE BODY') AND STATUS='VALID';
  IF v_count<>4 THEN RAISE_APPLICATION_ERROR(-20902,'Both packages and bodies must be VALID.'); END IF;
END;
/
@@05_seed.sql
@@06_verification.sql
PROMPT Installation scripts finished. Review verification rows before running transactions.
PROMPT Sample WEB_ACCOUNTS remain inactive until securely provisioned by your backend.
