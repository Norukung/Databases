# Ginger Hotel — เว็บไซต์จองห้องพักโรงแรมเดียว

โครงงาน HTML5/CSS3/JavaScript ภาษาไทย พร้อม Demo ของ USER/STAFF/ADMIN, Oracle SQL/PLSQL และ API Contract **ยังไม่มี Backend และยังไม่ได้เชื่อม Oracle จริง**

ตรวจงานเดิมและทำต่อแล้ว โดยคงหน้าจอและเส้นทางที่ใช้งานได้ อ่านโครงสร้างจาก **Normalize.pdf** ที่ผู้ใช้ระบุ และแทนร่างเก่าด้วย DDL ตามไฟล์จริง ดู [ผลตรวจ Schema](docs/SCHEMA-REVIEW.md) และ [รายการงานรอบนี้](docs/COMPLETION-REVIEW.md)

## เปิด Demo

เปิด [public/index.html](public/index.html) ด้วย Chrome/Edge หรือ VS Code Live Server ได้ สำหรับทดสอบหลายแท็บให้เปิดผ่าน HTTP:

```powershell
cd C:\Users\tawan\Desktop\GingerHotel
npm start
```

เปิด **http://127.0.0.1:4173** ไม่ต้อง npm install และไม่มี runtime framework ที่ต้องดาวน์โหลด ภาพประกอบอยู่ในโครงการทั้งหมด tools/server.cjs เป็น static preview server ไม่ใช่ API Backend

## ทดลองครบหนึ่งรอบ

1. เลือกเช็กอินวันนี้ เช็กเอาต์อีก 2 วัน ผู้เข้าพัก 4 คน 2 ห้อง แล้วเลือก Ginger Superior 2 ห้อง
2. เลือกบัญชีลูกค้า “พิมพ์ชนก” กรอกข้อมูล เลือกอาหารเช้า 2 หน่วยและ SLOW10 ยอดรวม **5,900 บาท** (6,000 + 500 − 600)
3. ยืนยันจองและส่งภาพ PNG/JPEG ไม่เกิน 1 MiB สถานะเป็น UNDER_REVIEW และการจองยังรอชำระ
4. สลับบัญชี STAFF เปิดหลักฐาน ตรวจยอด และอนุมัติ การจองจึงเป็น CONFIRMED
5. เช็กอิน → บันทึกบริการเป็นใช้จริง → เช็กเอาต์ ห้องเป็น CLEANING → ยืนยันเตรียมห้องจึงเป็น AVAILABLE
6. ทดลองจองล่วงหน้าอีก 5 วัน ชำระ/อนุมัติ แล้ว USER ส่งคำขอยกเลิก STAFF พิจารณา ADMIN บันทึกคืนเงินพร้อมเลขอ้างอิง
7. ADMIN จัดการลูกค้า พนักงาน บทบาท สิทธิ์ตรวจชำระ/ยกเลิก ห้อง ประเภทห้อง ราคา บริการ และโปรโมชั่นได้
8. เมนู ADMIN “ช่วงปิดซ่อมล่วงหน้า” เพิ่มช่วงที่ไม่ทับการจอง แล้วลองค้นหาในช่วงนั้น ห้องดังกล่าวจะไม่ถูกเสนอ แต่ยังจองช่วงวันข้างเคียงได้

นาฬิกา Demo เริ่มวันนี้เวลาไทย 15:00 เพื่อทดลองเช็กอินได้ทันที เมนู “ตั้งค่าการทดลอง” ใช้เลื่อนไปข้างหน้าหรือล้างข้อมูลสาธิต บัญชีจำลองไม่มีรหัสผ่านและไม่ใช่ Authentication จริง

IndexedDB ใช้ transaction เก็บข้อมูลและภาพเฉพาะ Mock ภายในเบราว์เซอร์ เพื่อป้องกันสองแท็บอ่านสถานะเก่า SessionStorage จำบัญชีต่อแท็บ ระบบนำเข้าข้อมูล LocalStorage เดิมครั้งแรกและปรับสิทธิ์เวอร์ชัน 1 เป็น 2 โดยรักษารายการจองไว้ หากไม่มี IndexedDB จะใช้ LocalStorage แบบแท็บเดียว ซึ่งไม่รับรองการจองพร้อมกันหลายแท็บ ใช้ข้อมูลสมมติเท่านั้น เมื่อใช้ระบบจริงต้องเก็บธุรกรรมใน Oracle และหลักฐานใน private storage ฝั่ง Backend IndexedDB นี้ไม่ได้ใช้แทน Oracle ของระบบจริง

## โครงสร้างโฟลเดอร์

```text
Normalize.pdf                 Relational Schema ที่อ่านจริง 16 ตาราง
public/
  index.html                  HTML shell และ accessibility landmarks
  css/styles.css              Desktop / Tablet / Mobile
  js/seed.js                  ข้อมูลสาธิต
  js/domain.js                validation และ transaction จำลองแบบ atomic
  js/service.js               จุดเปลี่ยน Mock → HTTP API
  js/app.js                   routing, forms, tables, dialogs
  assets/                     ภาพสาธิตและ favicon
sql/
  install_project.sql         ตัวเรียกติดตั้งบน schema ว่าง
  00_original_schema.sql      ตาราง/คอลัมน์/PK/FK ที่ถอดจาก Normalize.pdf
  02_proposed_migration.sql   ส่วนเพิ่ม, CHECK, defaults, sequences, triggers
  03_queries.sql              Q01–Q15 ใช้ bind variables
  04_transactions.sql        GINGER_API: จอง ชำระ เข้าออก บริการ ยกเลิก ซ่อม
  05_seed.sql                ตัวอย่างครบ FK และบัญชีเว็บที่ยังไม่เปิดใช้
  06_verification.sql        ตรวจ USER_ERRORS/constraints/ยอด/overlap
  07_concurrency_manual.sql  วิธีทดสอบ Oracle สอง sessions
  08_admin_transactions.sql  GINGER_MANAGEMENT: ข้อมูลหลักและโปรไฟล์
  draft/01_baseline.sql      ร่างเก่าที่เลิกใช้ ห้ามรันร่วมกับชุดปัจจุบัน
docs/                         Schema, หน้าจอ/สิทธิ์, API, ผลทดสอบ, ที่มารูป
tests/                        domain, service, static SQL, browser journey
test-results/                 ผลทดสอบและภาพหน้าจอ
reference-review/             ภาพเอกสารสำหรับตรวจในเครื่อง
tools/                        static server และเครื่องมือ render PDF
```

## ติดตั้ง SQL ใน Oracle SQL Developer

เป้าหมาย Oracle Database 19c ขึ้นไป เปิด connection ไปยัง **schema ว่างสำหรับโครงงาน** ใช้ UTF-8 และ database character set รองรับไทย เช่น AL32UTF8 จากนั้นเปิด sql/install_project.sql และกด Run Script (F5)

ลำดับภายใน: 00_original_schema → 02_proposed_migration → 04_transactions → 08_admin_transactions → ตรวจ package errors → 05_seed → 06_verification ตัวติดตั้งหยุดหากพบตารางโรงแรมเดิมหรือ package ไม่ VALID; DDL มี implicit COMMIT และไม่ย้อนกลับด้วย ROLLBACK

หาก SQL Developer ไม่ resolve @@ relative path ให้เปิดรันทีละไฟล์ตามลำดับข้างต้น แยก 03_queries เป็น collection ที่ต้องเลือก query และกำหนด bind variables ไม่รันทุก query โดยไม่มีค่า bind

- ต้องตรวจ USER_ERRORS และ USER_OBJECTS ก่อนใช้งาน Package
- WEB_ACCOUNTS ใน seed ปิดใช้งานและไม่มี password hash ต้องให้ Backend provision hash จริงก่อนเรียก protected procedures ไม่ใส่ hash ปลอมเพื่อให้ผ่าน constraint
- ไม่ใช้ draft/01_baseline.sql แล้ว และไม่ใช้ Migration นี้ทับฐานเดิมที่มีข้อมูลโดยไม่มีแผน backfill
- BEGIN เริ่ม PL/SQL block ไม่ใช่ START TRANSACTION แต่ละ public procedure รับผิดชอบ COMMIT/ROLLBACK ทั้งชุด ใช้ connection ที่ไม่มีงานอื่นค้าง Helpers ไม่มี COMMIT และไม่ค้าง transaction ระหว่างรอชำระ/อนุมัติ
- ทุกการจัดสรรห้องล็อก ROOMS ตาม ROOM_ID ก่อน BOOKINGS แล้วตรวจวันที่ซ้ำหลังได้ล็อก

**ยังไม่ได้รันหรือคอมไพล์สคริปต์กับ Oracle จริงในเครื่องนี้** การตรวจ static ไม่ทดแทนผลทดสอบฐานข้อมูล

## เอกสารส่งมอบ

- [แผนผังหน้า เมนู และฟังก์ชัน → ตาราง → Transaction → สิทธิ์](docs/DESIGN-AND-FUNCTIONS.md)
- [Schema ที่อ่านได้จริง สมมติฐาน และส่วนเพิ่ม](docs/SCHEMA-REVIEW.md)
- [API Contract: Request / Response / Error](docs/API.md)
- [ผลทดสอบและข้อจำกัด](docs/TESTING.md)
- [ตรวจส่วนที่เสร็จเดิมและงานที่ทำต่อ](docs/COMPLETION-REVIEW.md)
- [ที่มาภาพประกอบ](docs/ASSETS.md)

## ทดสอบ

```powershell
npm test
# เปิด npm start ในอีก terminal แล้ว:
npm run test:browser
```

ชุดทดสอบใช้ Node.js ที่ติดตั้งในเครื่อง (ทดสอบด้วย v24.18.0) และ Chrome headless สำหรับ browser journey; กำหนด CHROME_PATH ได้ถ้า Chrome อยู่ที่อื่น ผลล่าสุด **37 tests ผ่าน** และ browser journey ผ่าน รวมจองพร้อมกันสองแท็บ 8 รอบ, หน้าปิดซ่อม และการเพิกถอนสิทธิ์ STAFF

## เมื่อเชื่อมฐานข้อมูลจริง

เสนอ Node.js + Express + node-oracledb เป็น Backend เพิ่มจากข้อกำหนดเดิม โดยยังไม่ได้ติดตั้ง ต้องทำ authentication, password hashing, authorization/ownership, CSRF, DTO mapping, private proof uploads, rate limiting, idempotency และ expiry worker ตาม API Contract รวมถึงฟอร์ม login จริงและการคืน session จาก cookie ก่อนเปลี่ยน service config.mode เป็น api

ให้ Backend คำนวณยอดและตรวจสิทธิ์ทุกคำขอ ใช้ bind variables; แยกบัญชีเว็บจากบัญชี Oracle และให้สิทธิ์ Oracle เท่าที่จำเป็น เช่น EXECUTE บน GINGER_API/GINGER_MANAGEMENT และ read views ที่จำเป็น SYSTEM_ROLE ไม่ทำให้เกิด Oracle GRANT อัตโนมัติ Browser ไม่รับรหัสผ่านหรือ credentials ของ Oracle
