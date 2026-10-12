# API Contract v1 (ข้อเสนอสำหรับ Backend ที่ยังไม่ได้สร้าง)

Base URL `/api/v1`; JSON UTF-8; TLS ในระบบจริง; ไม่มีการเชื่อม Oracle จาก Browser ตัวอย่างวันที่ด้านล่างเป็นเพียงรูปแบบข้อมูล ต้องเลือกวันที่อนาคตเมื่อทดลองจริง

ทุก screen เรียก `HotelService.call(method,payload)` ใน `public/js/service.js`; Mock และ API ใช้ DTO เดียวกัน โหมดปัจจุบันเป็น **mock** การเปลี่ยน `config.mode` เป็น `api` จะส่ง HTTP ไปยัง endpoint ด้านล่าง แต่ยังไม่มี Backend รับคำขอ จึงไม่ถือว่าเชื่อมต่อแล้ว

## รูปแบบและตัวตน

- สำเร็จ `{"data": ...}`; error `{"error":{"code":"ROOM_UNAVAILABLE","message":"ห้องที่เลือกไม่ว่างแล้ว","fields":{},"requestId":"..."}}`
- Date-only: `YYYY-MM-DD` ใน Asia/Bangkok; timestamps: ISO 8601 พร้อม offset; ID เป็น integer; เงินเป็น JSON number ปัด 2 ตำแหน่ง Backend ควรคำนวณเป็นหน่วยสตางค์หรือ decimal แล้ว bind NUMBER ไม่ใช้ floating point เป็นแหล่งจริง
- ใช้ HttpOnly, Secure, SameSite session cookie; ตรวจ CSRF ในทุก mutation; `X-CSRF-Token` ได้จาก session bootstrap ที่ Backend จัดให้ (`window.GINGER_CSRF_TOKEN` เป็น token ป้องกัน CSRF ไม่ใช่ password หรือ Oracle credential)
- Backend อ่าน account/customer/employee/role จาก session แล้วตรวจฐานข้อมูลทุกคำขอ ห้ามเชื่อ id/role/ราคาที่ Browser ส่งเพื่อให้สิทธิ์
- USER เข้าถึง booking/payment/proof/request ที่ไม่ใช่ตนให้ตอบ 404 เพื่อไม่เปิดเผยว่ามีรายการนั้น; STAFF/ADMIN ต้องตรวจบทบาทและสิทธิ์การตรวจรับเงิน/ยกเลิก
- mutation ต้องมี idempotency handling ฝั่ง Backend สำหรับ network retry โดย scoped ตาม account+endpoint+key; request hash เปลี่ยนเมื่อใช้ key เดิมให้ 409 ตัว frontend ปัจจุบันกันการกดซ้ำและไม่ retry POST อัตโนมัติ; หลัง network error ให้ตรวจรายการก่อนส่งใหม่
- JSON body จำกัด 1.5 MB; รูปไฟล์จริงสูงสุด 1 MiB (base64 ประมาณ 1.4 MB) ทุก field มี maximum length; reject unknown fields ฝั่ง Backend

## DTO ที่หน้าจอใช้

`Actor`: `{id, role:"USER|STAFF|ADMIN", name, firstName, lastName, email, phone, active, canReviewPayments, canReviewCancellations}` โดย id เป็น customerId สำหรับ USER และ employeeId สำหรับพนักงาน ส่วน accountId อยู่ใน server session เท่านั้น

`RoomType`: `{id,name,description,price,beds,capacity,size,active,createdAt,updatedAt}`

`Room`: `{id,number,typeId,floor,status,active,createdAt,updatedAt}`

`Service`: `{id,name,description,price,active}`

`Promotion`: `{id,name,code,percent,minNights,minAmount,startDate,endDate,active}`

`Customer/Employee`: `{id,firstName,lastName,email,phone,active,createdAt,updatedAt}` + `role,jobTitle,canReviewPayments,canReviewCancellations` เฉพาะ Employee; email/phone มาจากรายการ IS_PRIMARY=1 ในตารางแยก ไม่ลบ secondary contacts; loginEmail ของ WEB_ACCOUNTS แยกจากอีเมลติดต่อ

`BookingDetail`:

```json
{
  "id": 1001, "code": "GH-01001", "customerId": 1, "employeeId": null,
  "checkIn": "2026-12-01", "checkOut": "2026-12-03", "guests": 4,
  "status": "PENDING_PAYMENT", "expiresAt": "2026-11-21T15:00:00+07:00",
  "rooms": [
    {"roomId":2,"number":"102","typeName":"Ginger Superior","price":1500},
    {"roomId":3,"number":"103","typeName":"Ginger Superior","price":1500}
  ],
  "roomTotal":6000,"serviceTotal":500,"discount":600,"total":5900,
  "promotionId":1,"promotionName":"พักนานอีกนิด ลด 10%",
  "paid":0,"balance":5900,
  "customer":{"id":1,"firstName":"พิมพ์ชนก","lastName":"ใจดี","email":"pim@example.test","phone":"0800000001"},
  "payments":[{"id":1002,"bookingId":1001,"amount":5900,"status":"PENDING","method":null,"proof":null,"createdAt":"2026-11-20T15:00:00+07:00","updatedAt":"2026-11-20T15:00:00+07:00"}],
  "usages":[{"id":1003,"bookingId":1001,"serviceId":1,"name":"อาหารเช้า","quantity":2,"unitPrice":250,"usageDate":"2026-12-01","status":"PLANNED"}],
  "stays":[],"requests":[],"cancellations":[],"refunds":[],
  "createdAt":"2026-11-20T15:00:00+07:00","updatedAt":"2026-11-20T15:00:00+07:00"
}
```

`Payment`: `{id,bookingId,amount,status,method,proof:boolean|null,note,reviewedBy,reviewedAt,submittedAt,paidAt,createdAt,updatedAt}` ไม่ส่ง private storage path

`Stay`: `{id,bookingId,actualCheckIn,actualCheckOut,checkInBy,checkOutBy}`

`CancellationRequest`: `{id,bookingId,reason,status,reviewedBy,note,createdAt,updatedAt}`

`Cancellation`: `{id,bookingId,reason,refundAmount,employeeId,createdAt}`

`Refund`: `{id,bookingId,cancellationId,amount,status,reference,completedBy,completedAt}`

## Authentication (ต้องเพิ่ม Backend และแบบฟอร์ม credentials ก่อนใช้จริง)

| HTTP | Request | Response | สิทธิ์ |
|---|---|---|---|
| POST `/auth/login` | `{email,password}` | 200 Actor + session cookie | public, rate limited |
| POST `/auth/logout` | `{}` | 200 `{data:{loggedOut:true}}`, revoke session | signed in |
| GET `/me` | — | 200 Actor | signed in |
| PATCH `/me` | `{firstName,lastName,email,phone}` | 200 Customer | USER ของตน |

401 INVALID_CREDENTIALS ใช้ข้อความเดียวทั้งอีเมลผิด/รหัสผิด; 429 TOO_MANY_ATTEMPTS; ห้ามส่ง password hash กลับไป Browser บัญชี Mock จากหน้าตัวเลือกบทบาทไม่ต้องใช้ password; ไม่อนุญาตส่ง role/id ตัวเลือกนั้นไป login จริง

## ค้นหาและคำนวณราคา

| HTTP | Request | Response | Query |
|---|---|---|---|
| GET `/catalog` | — | `{roomTypes:RoomType[],services:Service[],promotions:Promotion[],now:ISO timestamp}` | Q02/Q03/Q11 เฉพาะ public fields |
| GET `/availability` | `?checkIn=2026-12-01&checkOut=2026-12-03&guests=4&rooms=2&typeId=1&maxPrice=2500&minCapacity=2` | `[{...RoomType,availableRooms:[2,3]}]` | Q01 |
| POST `/quotes` | QuoteRequest ด้านล่าง | Quote | Q01–Q03; คำนวณจาก DB |

```json
{
  "checkIn":"2026-12-01","checkOut":"2026-12-03","guests":4,
  "roomIds":[2,3],"services":[{"serviceId":1,"quantity":2}],"promotionId":1
}
```

Quote = `{rooms:[{roomId,price,typeName,number}],services:[{serviceId,name,quantity,unitPrice}],nights,roomTotal,serviceTotal,discount,total,promotionId,promotionName,eligiblePromotions:Promotion[]}`; ไม่รับราคาหรือส่วนลดจาก Browser ในการคิดยอด วันที่ผิด 422 INVALID_DATES; จำนวนผิด 422 INVALID_GUESTS; โปรผิด 422 PROMOTION_INELIGIBLE; ห้องไม่ว่าง 409 ROOM_UNAVAILABLE

## การจอง

| HTTP | Request | Response | Transaction / สิทธิ์ |
|---|---|---|---|
| POST `/bookings` | QuoteRequest + `{accepted:true,expectedTotal:5900,customerId?:1}` | 201 BookingDetail | CREATE_BOOKING; USER ใช้ customerId จาก session; STAFF เลือกลูกค้าได้ |
| GET `/bookings` | — | 200 BookingDetail[] | Q04–Q10, scope ตาม role |
| GET `/bookings/:id` | — | 200 BookingDetail | Q04–Q10, owner/STAFF/ADMIN |
| POST `/bookings/:id/check-in` | `{}` | 200 BookingDetail | CHECK_IN, STAFF/ADMIN |
| POST `/bookings/:id/check-out` | `{}` | 200 BookingDetail | CHECK_OUT, STAFF/ADMIN |

รายการปัจจุบันสัญญาเป็น array เพื่อให้หน้าเว็บค้นหา/แบ่งหน้าได้ทันที สำหรับข้อมูลจริงจำนวนมากให้เพิ่ม server pagination แล้วปรับเฉพาะ Service Layer/ตัวโหลดตารางให้รับ `{items,total,page,pageSize}` (Q04 มี OFFSET/FETCH ให้แล้ว) ไม่เปิดเผยรายการอื่นแล้วค่อยกรองใน Browser

409 PRICE_CHANGED เมื่อ expectedTotal ไม่ตรงยอดคำนวณใหม่; 409 ROOM_NOT_READY; 409 INVALID_STATE/ALREADY_CHECKED_IN/ALREADY_CHECKED_OUT; 409 OUTSTANDING_BALANCE; 409 SERVICE_UNRESOLVED; 409 INVENTORY_BUSY เมื่อ ORA-30006/ORA-00054; 409 RETRY_TRANSACTION เมื่อ ORA-00060 หลัง rollback ทั้งชุด

## ชำระเงินและหลักฐาน

| HTTP | Request | Response | Transaction / สิทธิ์ |
|---|---|---|---|
| POST `/bookings/:id/payments` | `{amount:5900,method:"BANK_TRANSFER",proof:"data:image/png;base64,..."}` | 201 `{id,status:"UNDER_REVIEW"}` | SUBMIT_PAYMENT, owner/STAFF/ADMIN |
| GET `/payments/:id/proof` | — | 200 `{proof:"data:image/png;base64,..."}` | ตรวจ owner ผ่าน booking หรือ STAFF; Cache-Control:no-store |
| POST `/payments/:id/review` | `{decision:"APPROVE",verifiedAmount:5900,note:"ยอดตรง"}` | 200 BookingDetail | REVIEW_PAYMENT; payment permission |

method = BANK_TRANSFER/PROMPTPAY; decision = APPROVE/REJECT; REJECT ต้อง note ไม่ว่าง; response รายการจองไม่เปลี่ยนเป็น CONFIRMED ตอน upload; ป้องกันซ้ำด้วย state + booking lock + unique UNDER_REVIEW index; การแจ้งรอบใหม่หลัง REJECTED สร้าง payment ใหม่ เก็บรายการปฏิเสธเดิม

Backend decode base64, เช็ก magic bytes และ decode รูปจริง, จำกัด 1 MiB, สแกนไฟล์, ตั้งชื่อสุ่ม, เก็บนอก public directory หรือ private object storage แล้วค่อยส่ง `p_proof_key,p_mime,p_bytes` ที่เชื่อถือได้ไป PL/SQL ห้ามเชื่อ `Content-Type` อย่างเดียว ล้างไฟล์ orphan หาก DB rollback; auth check ทุกครั้งก่อนอ่านรูป; ห้ามส่ง permanent public URL

413 FILE_TOO_LARGE, 415 INVALID_FILE, 422 AMOUNT_MISMATCH, 409 PAYMENT_ALREADY_UNDER_REVIEW/PAYMENT_ALREADY_PROCESSED, 409 BOOKING_EXPIRED

## บริการและการยกเลิก

| HTTP | Request | Response | Procedure / สิทธิ์ |
|---|---|---|---|
| POST `/bookings/:id/services` | `{serviceId:3,quantity:1,status:"USED"}` | BookingDetail | ADD_SERVICE; STAFF/ADMIN |
| PATCH `/service-usage/:id` | `{status:"USED"}` หรือ CANCELLED | BookingDetail | RESOLVE_SERVICE; STAFF/ADMIN |
| POST `/bookings/:id/cancellation-requests` | `{reason:"เปลี่ยนกำหนดการ"}` | BookingDetail ที่ status ยังไม่ CANCELLED | REQUEST_CANCELLATION; owner/STAFF/ADMIN |
| POST `/cancellation-requests/:id/review` | `{decision:"APPROVE",note:"ผ่านนโยบาย"}` | BookingDetail | REVIEW_CANCELLATION; cancellation permission |
| POST `/refunds/:id/complete` | `{reference:"BANK-REFERENCE"}` | Refund | COMPLETE_REFUND; ADMIN |
| POST `/rooms/:id/prepare` | `{}` | Room | PREPARE_ROOM; STAFF/ADMIN |

PLANNED USAGE_DATE ใช้ TIMESTAMP วันเริ่มเข้าพักเวลา 00:00 ของไทย, USED ใช้เวลาจริงที่บันทึก; ไม่รับ unitPrice; แก้ status ซ้ำ 409; การยกเลิกต้องตรวจ payment ที่ UNDER_REVIEW ก่อน (409 REVIEW_PAYMENT_FIRST); refund duplicate 409 INVALID_REFUND; ไม่มี roomStatus=AVAILABLE โดยอัตโนมัติเมื่อยกเลิก

การเพิ่มบริการต้องไม่มี payment UNDER_REVIEW เพื่อรักษายอดที่กำลังตรวจ ให้ตรวจหลักฐานค้างก่อนเพิ่มบริการรอบถัดไป

## Dashboard และข้อมูลหลัก

GET `/dashboard` → `{today,checkIns,checkOuts,reviews,cancellations,rooms:Room[],stays:Stay[],customers:Customer[],audit:[{id,action,actor,targetId,at}]}` สิทธิ์ STAFF/ADMIN; server จำกัด audit fields ตามสิทธิ์

GET `/management/:entity` → DTO[]; STAFF อ่าน rooms/customers เพื่อทำงานได้ ส่วน entities อื่น ADMIN เท่านั้น

POST `/management/:entity` → DTO; body `{id:null|integer,entity,values:{...}}` id null เพิ่ม, id มีค่าแก้; entity ต้องตรง URL ห้าม dynamic SQL จาก entity ที่ไม่ได้ whitelist:

| entity | values ที่จำเป็น | สิทธิ์ |
|---|---|---|
| customers | firstName,lastName,email,phone,active | ADMIN; STAFF เพิ่มได้ |
| employees | firstName,lastName,email,phone,jobTitle,role,active,canReviewPayments,canReviewCancellations | ADMIN |
| rooms | number,typeId,floor,status,active | ADMIN |
| roomTypes | name,description,price,beds,capacity,size,active | ADMIN |
| services | name,description,price,active | ADMIN |
| promotions | name,code,percent,minNights,minAmount,startDate,endDate,active | ADMIN |

ตัวอย่างแก้ราคา: `{"id":1,"entity":"services","values":{"name":"อาหารเช้า","description":"1 ชุด / ท่าน / มื้อ","price":275,"active":true}}`; ไม่แก้ UNIT_PRICE_AT_USE เดิม; ไม่รับ fields นอก allowlist เช่น createdAt/updatedAt/role ใน customer; ไม่เปิด DELETE; มีการอ้างอิงให้ปิดใช้งาน; ห้าม self demote/disable ADMIN; แก้ห้องที่ถูกจัดสรรอยู่ให้ 409 ROOM_ALLOCATED; รหัสซ้ำ 409 DUPLICATE_CODE/DUPLICATE_ROOM; 403 FORBIDDEN ทุกคำสั่งผิดสิทธิ์

แบบฟอร์มข้อมูลหลักไม่สร้าง password/บัญชี login อัตโนมัติ Backend ต้องมี workflow ตั้งบัญชีและ hash แยก; SYSTEM_ROLE ไม่ใช่ Oracle GRANT

## การแปลง SQL → DTO

BOOKING_ID → id และ code = `GH-` + padded id; CHECK_IN_DATE → checkIn; ROOM_AMOUNT → roomTotal; SERVICE_AMOUNT → serviceTotal; AGREED_PRICE_PER_NIGHT → rooms[].price; UNIT_PRICE_AT_USE → usages[].unitPrice; ACTUAL_CHECK_IN/OUT → stays[].actualCheckIn/Out; EMPLOYEE_ID ของ STAY → checkInBy; CHECK_OUT_EMPLOYEE_ID → checkOutBy; PAYMENTS.REVIEW_NOTE → note; REFUNDS.TRANSFER_REFERENCE → reference

## Mapping ตาม Normalize.pdf

ใช้ 00_original_schema.sql + 02_proposed_migration.sql ไม่ใช้ draft/01_baseline.sql แล้ว:

| SQL | DTO / นโยบาย |
|---|---|
| SERVICE_USAGE.USAGE_ID | usages[].id |
| PAYMENTS.PAYMENT_PROOF | private storage key; เปิดผ่าน proof endpoint เท่านั้น |
| PAYMENTS.PAID_AT | paidAt เวลาตรวจรับสำเร็จ; SUBMITTED_AT (เพิ่ม) คือเวลาส่งหลักฐาน |
| EMPLOYEES.JOB_TITLE | jobTitle |
| CUSTOMER_PHONES / EMPLOYEE_PHONES.PHONE_NUMBER | phone ของรายการ IS_PRIMARY=1 |
| CANCELLATIONS.CANCELLED_AT / CANCELLATION_REASON | cancelledAt / reason |
| DELETED_AT ของ 5 master tables | active = DELETED_AT IS NULL; SERVICES ต้อง SERVICE_STATUS=ACTIVE ด้วย |
| ROOMS.IS_ACTIVE (เพิ่ม) | active; ROOMS ไม่มี DELETED_AT |
| WEB_ACCOUNTS.CAN_REVIEW_PAYMENTS / CAN_REVIEW_CANCELLATIONS | flags ของ Actor/Employee; ADMIN อนุมัติได้ตาม role |

TIMESTAMP ทั้งเดิมและส่วนเพิ่มเก็บเวลาไทยไม่มี timezone ในชนิดข้อมูล ให้ DTO เติม +07:00 อย่างถูกต้อง DATE ช่วงจองส่ง YYYY-MM-DD การแก้ flags พนักงานอัปเดตเฉพาะ WEB_ACCOUNTS ที่ผูกอยู่แล้ว ไม่สร้าง login/password เอง พนักงานใหม่ต้อง provision account และสิทธิ์ที่ต้องการภายหลัง

POST /management/:entity เรียก GINGER_MANAGEMENT.SAVE_MASTER โดย trusted account มาจาก session; PATCH /me เรียก GINGER_MANAGEMENT.UPDATE_PROFILE ซึ่งเลือก CUSTOMER_ID จาก account เอง

ขนาดข้อมูล: ชื่อคน/ตำแหน่ง/ประเภทห้อง 100 ตัวอักษร; ชื่อบริการ/โปรโมชั่น 150; room-type description 500; service description 1000; email ติดต่อ 255; phone/room number 20; promotion code 40; note/reason ของการพิจารณา 500; refund reference 100

## ช่วงปิดซ่อมล่วงหน้า

GET /maintenance → 200 {data:Maintenance[]} สำหรับ STAFF/ADMIN ผ่าน Q13

POST /maintenance สำหรับ ADMIN → 201 {data:{id,roomId,startDate,endDate,reason,createdBy,createdAt,updatedAt}} โดยเรียก GINGER_API.SCHEDULE_MAINTENANCE แล้วโหลดรายการจาก Q13 ตาม roomId/startDate/endDate

Request ตัวอย่าง:

```json
{"roomId":4,"startDate":"2026-12-01","endDate":"2026-12-03","reason":"ซ่อมเครื่องปรับอากาศ"}
```

Maintenance จาก GET เพิ่ม roomNumber และ status ซึ่งคำนวณเป็น SCHEDULED, IN_PROGRESS, COMPLETED ตามวันโรงแรม ไม่เพิ่ม status column ใน ROOM_MAINTENANCE ช่วงซ่อมเป็น [startDate,endDate) และไม่เปลี่ยน ROOM_STATUS ปัจจุบัน

403 FORBIDDEN; 422 INVALID_MAINTENANCE_DATES/REASON_REQUIRED; 409 ROOM_ALLOCATED; 409 MAINTENANCE_OVERLAP; 404 NOT_FOUND ทั้งค้นหาและสร้างจองตรวจช่วงซ่อม การกำหนดช่วงล็อก ROOMS ด้วยกติกาเดียวกับ CREATE_BOOKING ไม่เปิด endpoint ลบประวัติซ่อม

## Error mapping

-20030 ของ GINGER_MANAGEMENT ให้แยกตามข้อความที่ allowlist: FORBIDDEN → 403, SELF_LOCKOUT/ROOM_ALLOCATED → 409, NOT_FOUND → 404, validation อื่น → 422

Domain error ใน PL/SQL -20001 → 401/403 ตามกรณี; -20002/NO_DATA_FOUND → 404; validation -20005..-20012 → 422 ยกเว้น ROOM_UNAVAILABLE/PRICE_CHANGED → 409; invalid state/duplicate/outstanding → 409; constraint violations → 409/422 ที่ระบุชื่อฟิลด์ได้; unexpected Oracle error → 500 INTERNAL_ERROR พร้อม requestId ห้ามส่ง SQL, bind values, stack trace หรือข้อมูลลับไปลูกค้า ต้อง rollback ก่อนตอบผิดพลาด

## สิ่งที่ยังต้องทำจริง

เสนอ **Node.js + Express + node-oracledb** เป็น Backend เพิ่มจากข้อกำหนดเดิม ไม่ได้ติดตั้งในงานนี้ ต้องสร้าง connection pool, DTO mapper, auth/session/CSRF, Argon2id password hashing, ownership middleware, private upload storage, rate limits, idempotency persistence, expiry worker, และ deploy ด้วย least privilege บัญชี Oracle application ไม่มี DDL/DROP และไม่เปิดข้อมูล credentials ให้ frontend

โปรไฟล์ที่รัน package ควรมี EXECUTE เฉพาะ API packages และ read views ที่จำเป็น; GINGER_MANAGEMENT เป็น definer-rights package ที่ตรวจบทบาทภายในแล้ว แต่ยังต้องคอมไพล์/ทดสอบและตั้ง EXECUTE grant บน Oracle จริง ไม่ให้ app รับชื่อ table หรือคำสั่ง SQL จาก request
