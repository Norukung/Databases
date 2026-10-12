# ผลตรวจ Schema จากไฟล์อ้างอิง

ตรวจซ้ำวันที่ 12 ตุลาคม 2569 หลังผู้ใช้ระบุโฟลเดอร์ พบไฟล์ **Normalize.pdf** ในรากโครงงาน (ชื่อไฟล์จริงไม่มี “(3)”) จำนวน 1 หน้า อ่านผังได้ครบ 16 ตาราง และใช้เป็น Relational Schema หลักแทนร่างที่สร้างไว้ก่อนหน้า

SHA-256: `19488A324C3AFF0DEE9F0F16D7670DBA1FED8BF1677EAF61F945561F3CEC697B`

ภาพที่อ่านอยู่ใน [reference-review/normalize/page-1.png](../reference-review/normalize/page-1.png) และ DDL ที่ถอดอยู่ใน [00_original_schema.sql](../sql/00_original_schema.sql)

## ขอบเขตที่อ่านยืนยันได้

อ่านชื่อคอลัมน์ ชนิดข้อมูล precision/scale เครื่องหมาย * (NOT NULL), P (PK), F (FK), U (unique) และความสัมพันธ์จากภาพได้จริง ส่วน DEFAULT, ค่า CHECK, sequence/identity และ BYTE/CHAR semantics ไม่ปรากฏในภาพ จึงแยก defaults/constraints/ID generation ไว้ใน Migration ไม่อ้างว่าเป็นข้อกำหนดเดิม ใช้ VARCHAR2 แบบ CHAR เพื่อรองรับภาษาไทย เป็นตัวเลือกการติดตั้งที่ระบุชัดเจน

ทุกเวลาจากต้นฉบับเป็น TIMESTAMP **ไม่มี time zone**; วันจองเป็น DATE ส่วน USAGE_DATE เป็น TIMESTAMP NOT NULL โครงงานกำหนดให้เก็บเวลาโรงแรม Asia/Bangkok และคำนวณด้วย CAST(SYSTIMESTAMP AT TIME ZONE 'Asia/Bangkok' AS TIMESTAMP) Backend ต้องส่ง ISO 8601 พร้อม +07:00 ห้ามตีความค่า TIMESTAMP เหล่านี้เป็น UTC

## ตารางและคอลัมน์เดิมทั้ง 16 ตาราง

`!` หมายถึง NOT NULL; รายละเอียดชื่อ constraint อยู่ใน DDL

| ตาราง | คอลัมน์ตามไฟล์ |
|---|---|
| CUSTOMERS | `CUSTOMER_ID NUMBER(10)!`<br>`FIRST_NAME VARCHAR2(100)!`<br>`LAST_NAME VARCHAR2(100)!`<br>`NATIONAL_ID VARCHAR2(13)`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!`<br>`DELETED_AT TIMESTAMP` |
| CUSTOMER_EMAILS | `CUSTOMER_ID NUMBER(10)!`<br>`EMAIL VARCHAR2(255)!` |
| CUSTOMER_PHONES | `CUSTOMER_ID NUMBER(10)!`<br>`PHONE_NUMBER VARCHAR2(20)!` |
| EMPLOYEES | `EMPLOYEE_ID NUMBER(10)!`<br>`FIRST_NAME VARCHAR2(100)!`<br>`LAST_NAME VARCHAR2(100)!`<br>`JOB_TITLE VARCHAR2(100)!`<br>`SYSTEM_ROLE VARCHAR2(10)!`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!`<br>`DELETED_AT TIMESTAMP` |
| EMPLOYEE_EMAILS | `EMPLOYEE_ID NUMBER(10)!`<br>`EMAIL VARCHAR2(255)!` |
| EMPLOYEE_PHONES | `EMPLOYEE_ID NUMBER(10)!`<br>`PHONE_NUMBER VARCHAR2(20)!` |
| ROOM_TYPES | `ROOM_TYPE_ID NUMBER(10)!`<br>`TYPE_NAME VARCHAR2(100)!`<br>`DESCRIPTION VARCHAR2(500)`<br>`PRICE_PER_NIGHT NUMBER(12,2)!`<br>`MAX_GUESTS NUMBER(3)!`<br>`BED_COUNT NUMBER(3)!`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!`<br>`DELETED_AT TIMESTAMP` |
| ROOMS | `ROOM_ID NUMBER(10)!`<br>`ROOM_TYPE_ID NUMBER(10)!`<br>`ROOM_NUMBER VARCHAR2(20)!`<br>`FLOOR_NUMBER NUMBER(3)!`<br>`ROOM_STATUS VARCHAR2(20)`<br>`LAST_INSPECTION_DATE DATE`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!` |
| PROMOTIONS | `PROMOTION_ID NUMBER(10)!`<br>`PROMOTION_NAME VARCHAR2(150)!`<br>`START_DATE DATE!`<br>`END_DATE DATE!`<br>`DISCOUNT_PERCENT NUMBER(5,2)!`<br>`CONDITIONS VARCHAR2(1000)`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!`<br>`DELETED_AT TIMESTAMP` |
| SERVICES | `SERVICE_ID NUMBER(10)!`<br>`SERVICE_NAME VARCHAR2(150)!`<br>`UNIT_PRICE NUMBER(12,2)!`<br>`CATEGORY VARCHAR2(100)`<br>`SERVICE_STATUS VARCHAR2(20)!`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!`<br>`DELETED_AT TIMESTAMP` |
| BOOKINGS | `BOOKING_ID NUMBER(10)!`<br>`CUSTOMER_ID NUMBER(10)!`<br>`EMPLOYEE_ID NUMBER(10)`<br>`PROMOTION_ID NUMBER(10)`<br>`GUEST_COUNT NUMBER(3)!`<br>`BOOKING_STATUS VARCHAR2(20)!`<br>`CHECK_IN_DATE DATE!`<br>`CHECK_OUT_DATE DATE!`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!` |
| BOOKING_ROOMS | `BOOKING_ID NUMBER(10)!`<br>`ROOM_ID NUMBER(10)!`<br>`AGREED_PRICE_PER_NIGHT NUMBER(12,2)!` |
| SERVICE_USAGE | `USAGE_ID NUMBER(10)!`<br>`BOOKING_ID NUMBER(10)!`<br>`SERVICE_ID NUMBER(10)!`<br>`QUANTITY NUMBER(10)!`<br>`USAGE_STATUS VARCHAR2(20)!`<br>`UNIT_PRICE_AT_USE NUMBER(12,2)!`<br>`USAGE_DATE TIMESTAMP!`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!` |
| PAYMENTS | `PAYMENT_ID NUMBER(10)!`<br>`BOOKING_ID NUMBER(10)!`<br>`PAYMENT_STATUS VARCHAR2(20)!`<br>`AMOUNT NUMBER(12,2)!`<br>`PAYMENT_METHOD VARCHAR2(50)`<br>`PAYMENT_PROOF VARCHAR2(500)`<br>`PAID_AT TIMESTAMP`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!` |
| STAY_HISTORY | `STAY_ID NUMBER(10)!`<br>`BOOKING_ID NUMBER(10)!`<br>`EMPLOYEE_ID NUMBER(10)!`<br>`ACTUAL_CHECK_IN TIMESTAMP!`<br>`ACTUAL_CHECK_OUT TIMESTAMP`<br>`NOTES VARCHAR2(1000)`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!` |
| CANCELLATIONS | `CANCELLATION_ID NUMBER(10)!`<br>`BOOKING_ID NUMBER(10)!`<br>`CANCELLED_AT TIMESTAMP`<br>`CANCELLATION_REASON VARCHAR2(1000)`<br>`REFUND_AMOUNT NUMBER(12,2)!`<br>`CREATED_AT TIMESTAMP!`<br>`UPDATED_AT TIMESTAMP!` |

## ความสัมพันธ์

- CUSTOMERS → CUSTOMER_EMAILS / CUSTOMER_PHONES; EMPLOYEES → EMPLOYEE_EMAILS / EMPLOYEE_PHONES แบบ 1:N
- BOOKINGS เชื่อม CUSTOMER_ID (จำเป็น), EMPLOYEE_ID และ PROMOTION_ID (อนุญาต NULL)
- BOOKINGS 1:N BOOKING_ROOMS N:1 ROOMS; BOOKING_ROOMS ใช้ PK คู่ (BOOKING_ID, ROOM_ID) และเก็บ AGREED_PRICE_PER_NIGHT
- ROOMS N:1 ROOM_TYPES; ROOM_NUMBER unique; NATIONAL_ID ของ CUSTOMERS unique และ nullable
- BOOKINGS 1:N PAYMENTS และ SERVICE_USAGE; SERVICE_USAGE N:1 SERVICES
- BOOKINGS 1:0..1 STAY_HISTORY และ CANCELLATIONS ผ่าน unique BOOKING_ID; STAY_HISTORY ต้องมี EMPLOYEE_ID
- ไม่มี ON DELETE CASCADE ที่อ่านพบ จึงไม่เพิ่มและไม่เปิด DELETE ธุรกรรม

## ความต่างจากร่างเก่าที่แก้แล้ว

| ร่างเก่าที่เลิกใช้ | ต้นฉบับที่ใช้จริง |
|---|---|
| SERVICE_USAGE_ID | USAGE_ID |
| PROOF_PATH / PAYMENT_DATE | PAYMENT_PROOF / PAID_AT; เสนอ SUBMITTED_AT แยกเวลาส่งหลักฐาน |
| POSITION_NAME | JOB_TITLE NOT NULL |
| PHONE | PHONE_NUMBER VARCHAR2(20) |
| CANCELLATION_DATE / REASON | CANCELLED_AT / CANCELLATION_REASON |
| TERMS | CONDITIONS |
| NATIONAL_ID VARCHAR2(30) | VARCHAR2(13) |
| TIMESTAMP WITH TIME ZONE ทุกตาราง | TIMESTAMP |
| timestamps บน contact tables และ BOOKING_ROOMS | ต้นฉบับไม่มี จึงไม่เพิ่มโดยปริยาย |
| IS_ACTIVE บนทุก master | ใช้ DELETED_AT เดิมใน 5 ตาราง และ SERVICE_STATUS; เสนอ IS_ACTIVE เฉพาะ ROOMS |

`sql/draft/01_baseline.sql` เก็บเป็นประวัติร่างเก่าและมีป้ายเลิกใช้ ห้ามรันร่วมกับ Migration ปัจจุบัน

## ส่วนเพิ่มที่เสนอ แยกใน 02_proposed_migration.sql

| ส่วนเพิ่ม | เหตุผล |
|---|---|
| WEB_ACCOUNTS | บัญชีเว็บแยกจากบัญชี Oracle; PASSWORD_HASH จาก Backend; ผูกลูกค้าหรือพนักงานเพียงอย่างใดอย่างหนึ่ง |
| CAN_REVIEW_PAYMENTS / CAN_REVIEW_CANCELLATIONS | STAFF ต้องมีสิทธิ์เฉพาะ; ADMIN อนุมัติตามบทบาท |
| CANCELLATION_REQUESTS | แยกคำขอ/ผลพิจารณาจาก CANCELLATIONS ที่ยกเลิกสำเร็จ |
| EXPIRES_AT และยอด snapshot 5 คอลัมน์บน BOOKINGS | อายุรอชำระ ยอดค่าห้อง/บริการ/ส่วนลด/รวม และเปอร์เซ็นต์ ณ เวลาจอง |
| SUBMITTED_AT, REVIEWED_BY/AT/NOTE, PROOF_MIME/BYTES | เวลาส่งและตรวจหลักฐาน; PAID_AT เดิมบันทึกเมื่ออนุมัติ |
| CHECK_OUT_EMPLOYEE_ID / RECORDED_BY / APPROVED_BY | แยกผู้ดำเนินการเช็กเอาต์ บริการ และยกเลิก |
| REFUNDS / AUDIT_LOG | แยกคืนเงินจริงกับจำนวนเงินที่ควรคืน และบันทึกผู้ดำเนินการ |
| ROOMS.IS_ACTIVE / ROOM_TYPES.AREA_SQM | ปิดขายห้องโดยไม่ลบประวัติ; ขนาดห้องสำหรับหน้าจอ |
| SERVICES.DESCRIPTION | คำอธิบายหน่วยบริการ; SERVICE_STATUS และ CATEGORY มีอยู่เดิม |
| PROMOTION_CODE, MIN_NIGHTS, MIN_ROOM_AMOUNT | เงื่อนไขโปรที่ตรวจด้วยโปรแกรม; CONDITIONS มีอยู่เดิม |
| IS_PRIMARY บน 4 ตารางติดต่อ | แก้ผู้ติดต่อหลักโดยเก็บข้อมูลรอง; unique index หนึ่งรายการหลักต่อคน |
| ROOM_MAINTENANCE | ช่วงปิดซ่อมล่วงหน้า มีหน้าจอ ADMIN, query, transaction และ mock |
| sequences + insert triggers | สร้าง ID ของ PK NUMBER(10) เดิม; ไม่เปลี่ยนเป็น identity เงียบ ๆ |
| timestamp triggers, CHECK, indexes, defaults | กติกาธุรกิจตามโจทย์และการทำงานจริง เป็นส่วนที่เสนอเพิ่ม |

มี DELETED_AT เดิมเฉพาะ CUSTOMERS, EMPLOYEES, ROOM_TYPES, SERVICES, PROMOTIONS ปิดใช้งานโดยบันทึกเวลา; เปิดกลับโดยล้าง DELETED_AT; SERVICES ใช้ SERVICE_STATUS ACTIVE/INACTIVE ร่วมด้วย ตารางอื่นไม่มีการเพิ่ม DELETED_AT

สถานะ Booking/Payment/Room/Service usage ใช้ VARCHAR2(20) ตามต้นฉบับ ความยาวพอสำหรับ PENDING_PAYMENT (15), UNDER_REVIEW (12), MAINTENANCE (11); SYSTEM_ROLE VARCHAR2(10) รองรับ STAFF/ADMIN ค่า CHECK ของสถานะอยู่ใน Migration เพราะไม่แสดงใน PDF

## อ้างอิงอื่นและข้อขัดกัน

ดีไซน์ “ดีไซน์ที่ยังไม่ได้ตั้งชื่อ.pdf” มี 9 หน้าและมีภาพที่ render ไว้ใน reference-review/design; คงแบรนด์ Ginger Hotel และหน้าจอที่ทำเสร็จไว้ หน้า 1–7 อ้างลำดับงานลูกค้า หน้า 8–9 อ้าง Sidebar/ตารางของพนักงาน

ER_-Page-2.drawio.png และ Relational Schema(1).pdf ที่พบก่อนหน้านี้แสดงแบบเก่าบางส่วน เช่น หนึ่งการจองหนึ่งห้อง ขัดกับ Normalize.pdf ซึ่งมี BOOKING_ROOMS ชัดเจน จึงใช้ Normalize.pdf และข้อกำหนดล่าสุดเป็นหลัก ไม่แก้ฐานกลับเป็นหนึ่งห้องต่อการจอง

## สิ่งที่ยังไม่ยืนยัน

ถอดโครงสร้างและตรวจ SQL แบบ static แล้ว แต่ **ยังไม่ได้คอมไพล์/รัน Oracle จริง** ต้องรัน install_project.sql ใน schema ว่าง ตรวจ USER_ERRORS และทดลอง transactions/concurrency บน Oracle การนำ Migration ไปใช้กับฐานที่มีข้อมูลเดิมต้องออกแบบ backfill แยก ห้ามรันสคริปต์ชุดติดตั้งทับข้อมูลจริง

การแก้ SELECT INTO ตรวจสิทธิ์ให้รับครบ 6 ค่าเป็นไปตาม [Oracle SELECT INTO](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/SELECT-INTO-statement.html); การอ่าน payload JSON ใช้ [Oracle JSON_VALUE](https://docs.oracle.com/en/database/oracle/oracle-database/19/adjsn/function-JSON_VALUE.html)
