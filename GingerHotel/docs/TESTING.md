# ผลการตรวจสอบ

ตรวจวันที่ 12 ตุลาคม 2569 บน Windows / Node.js v24.18.0 / Chrome headless ข้อมูลทั้งหมดเป็นข้อมูลสาธิต ไม่มีการเชื่อม Oracle หรือโอนเงิน

## ตรวจของเดิมก่อนทำต่อ

รัน 20 domain tests เดิมผ่าน จากนั้นคงเส้นทางงานที่มีอยู่และเพิ่ม regression tests สำหรับส่วนแก้ไข ไม่เริ่มสร้างเว็บไซต์ใหม่

## ผลล่าสุด

`npm test` — **37 tests ผ่าน** แบ่งเป็น 29 domain, 4 Service Layer และ 4 static SQL checks

| กลุ่ม | สิ่งที่ตรวจ |
|---|---|
| วันที่ / จำนวน | วันย้อนหลัง วันออกไม่เกินวันเข้า วันที่ไม่มีจริง ห้องซ้ำ จำนวนผู้เข้าพักเกินความจุ |
| หลายห้อง / ราคา | ห้อง 2 ห้องพร้อมบริการและโปรโมชั่นยอด 5,900 บาท เก็บราคาประวัติและ rollback ทั้งชุด |
| ห้องเต็ม / ทับช่วง | รายการแข่งกันสำเร็จหนึ่งรายการ; เช็กเอาต์ตรงวันเช็กอินถัดไปไม่ทับ |
| การชำระ | ส่งหลักฐานยังไม่ CONFIRMED, ส่งซ้ำ/อนุมัติซ้ำไม่ได้, ยอดผิดถูกปฏิเสธ, เก็บประวัติ rejection |
| เช็กอิน / เช็กเอาต์ | ป้องกันซ้ำ, ห้องไม่พร้อมหนึ่งห้องทำให้ rollback ทุกห้อง, checkout ต้องไม่ค้างยอดและบริการ |
| บริการ | เพิ่มยอดค้างโดยไม่แก้ PAID เดิม, ราคาประวัติไม่เปลี่ยนเมื่อ ADMIN เปลี่ยนราคา |
| ยกเลิก / คืนเงิน | คำขอไม่ยกเลิกทันที, ป้องกันซ้ำ, คืนยอดตามเวลาและแยก refund PENDING จาก REFUNDED |
| หมดอายุ | ปล่อยห้องเมื่อไม่ส่งหลักฐาน; UNDER_REVIEW ยังกันห้อง; รายการหมดอายุไม่ขวางการจัดการห้อง |
| สิทธิ์ | ลูกค้าคนอื่นดู/ชำระ/ยกเลิกไม่ได้; anonymous จองไม่ได้; STAFF แก้พนักงานไม่ได้; ถอนสิทธิ์มีผลต่อ session เดิม |
| ADMIN | ป้องกันปิด/ลดสิทธิ์ตนเอง, บัญชีปิดใช้งานทำงานไม่ได้, ขนาดฟิลด์และชั้นห้องถูกตรวจ |
| จองหน้าเคาน์เตอร์ | STAFF เพิ่มลูกค้าและจองแทนได้ เก็บ employeeId และ owner ถูกต้อง |
| ปิดซ่อม | เฉพาะ ADMIN กำหนด, กันช่วงทับ, ไม่ย้ายสถานะห้องปัจจุบัน, วันข้างเคียงจองได้, ซ่อมทับผู้เข้าพัก/การจองไม่ได้, เก็บประวัติหลังสิ้นสุด |
| ตรวจซ้ำก่อนเข้า | ตรวจช่วงปิดซ่อมก่อนเช็กอิน และ rollback หลายห้องเมื่อมีข้อขัดกัน |
| Service Layer | upgrade ข้อมูลเก่าไม่หาย, storage failure ไม่บันทึกครึ่งรายการ, HTTP routing/CSRF/session, ส่งต่อ error จาก Backend จำลอง |
| Static SQL | วงเล็บสมดุล, จำนวน SELECT INTO, INSERT/FK columns และ UPDATE columns เทียบ DDL + Migration |

Static SQL tests เป็นการตรวจข้อความและความสอดคล้องเฉพาะกฎข้างต้น **ไม่ใช่ Oracle parser หรือผลคอมไพล์/ทดสอบฐานข้อมูล**

`npm run test:browser` — **ผ่าน** ดู [browser-results.json](../test-results/browser-results.json)

- ค้นหา → เลือก 2 ห้อง → กรอกข้อมูล → บริการ/โปรโมชั่น → ยืนยันยอด
- แนบไฟล์ผ่าน input จริง → UNDER_REVIEW → STAFF อนุมัติ → เช็กอิน → ใช้บริการ → เช็กเอาต์ → เตรียมห้อง
- USER ขอยกเลิก → STAFF อนุมัติผ่าน modal; ADMIN แก้ราคาบริการ
- ตารางค้นหาและแบ่งหน้า; ลูกค้าคนอื่นเปิดรายละเอียดไม่ได้
- ADMIN กำหนดช่วงปิดซ่อมผ่าน form และตรวจผลค้นหาไม่คืนห้องในช่วงนั้น
- ADMIN ถอนสิทธิ์ตรวจรับชำระของ STAFF; ปุ่มหายและเรียก Service Layer ตรงได้ FORBIDDEN
- ส่งจองห้องเดียวกันพร้อมกันจาก 2 แท็บจริง 8 รอบโดยเปลี่ยนช่วงวันที่: สำเร็จหนึ่งรายการ อีกแท็บ ROOM_UNAVAILABLE
- Desktop 1440px, Mobile 390px ของหน้าแรก/แดชบอร์ด และ Tablet 768px ของหน้าปิดซ่อม ไม่มี page overflow
- ไม่พบ uncaught JavaScript exceptions ในเส้นทางที่ทดสอบ

Browser test ใช้ profile และ debugging port แยกต่อการรัน ไม่ใช้ profile ส่วนตัว ไฟล์หลักฐานทดสอบเป็นภาพ 1×1 pixel ทดสอบการรับไฟล์เท่านั้น

## การตรวจเอกสารอ้างอิง

อ่าน Normalize.pdf ครบ 16 ตารางและตรวจภาพ [หน้า Schema](../reference-review/normalize/page-1.png) เทียบ DDL ใหม่ ร่างเดิมถูกระบุเลิกใช้แล้ว ตรวจแยกส่วนเพิ่มที่ไม่มีใน PDF เช่นบัญชี ยอด snapshot สิทธิ์และการปิดซ่อมไว้ใน Migration

ภาพหน้าแรกและหน้าจอพนักงานเดิม รวมถึงหน้าปิดซ่อมที่เพิ่ม อยู่ใน test-results/ ได้ตรวจด้วยตาในเครื่องแล้ว

## ยังไม่ได้ทดสอบ

1. Compile/execute ทุก DDL, trigger, sequence, Query และ Package บน **Oracle จริง**: ไม่มี connection/instance ให้ทดสอบในงานนี้
2. Oracle concurrency/deadlock/rollback: ทำตาม 07_concurrency_manual.sql สอง sessions และขยาย cancel-vs-book, expire-vs-payment, maintenance-vs-book และ price-vs-book
3. Authentication/Backend จริง, password hashing, CSRF, uploads/private storage, rate limits, idempotency และ expiry worker
4. Oracle grants ของบัญชีแอป และการแยก schema owner จาก runtime account
5. Migration/backfill ฐานที่มีข้อมูลเดิม; สคริปต์ติดตั้งสำหรับ schema ว่างเท่านั้น
6. Payment/refund integration, hosting, Safari/Firefox, อุปกรณ์จริง และ screen reader/keyboard ครบชุด

IndexedDB readwrite transaction เป็นการจำลอง concurrency ภายใน origin เดียว ไม่พิสูจน์ความปลอดภัยหรือการล็อกของ Oracle ผู้ใช้ DevTools แก้ข้อมูล Demo ได้

ระหว่างตรวจพบว่า LocalStorage + Web Locks เดิมเกิด stale read ข้ามแท็บได้เป็นบางครั้ง จึงเปลี่ยน Mock ให้ read/validate/write อยู่ใน transaction เดียวของ IndexedDB การทดสอบ storage quota ใน Service unit tests ใช้ fallback LocalStorage ส่วน browser journey ใช้ IndexedDB จริง

## เมื่อมี Oracle

- เปิด install_project.sql ด้วย SQL Developer แล้วกด F5 บน schema ว่าง ตรวจ USER_ERRORS ต้องไม่มี error และ GINGER_API/GINGER_MANAGEMENT ทั้ง spec/body ต้อง VALID
- 06_verification.sql ต้องไม่พบยอดผิด, foreign key ปิดใช้, การจัดสรร/ช่วงซ่อมทับ หรือห้องมีผู้เข้าพักจริงแต่สถานะไม่ OCCUPIED
- ใช้ test accounts ที่ Backend provision hash จริงแล้ว ทดสอบ A–G ทั้ง success และ failure เปรียบเทียบจำนวนแถว/ยอดก่อนหลัง
- เรียกอนุมัติชำระ, เช็กอิน, เช็กเอาต์, อนุมัติยกเลิกและคืนเงินซ้ำ ต้อง error และไม่มีผลข้างเคียงเพิ่ม
- ทดลองหลายห้อง [2,3] กับ [3,2] จากสอง sessions ต้องไม่มีการจองทับ
- ทดสอบเพิกถอนสิทธิ์ STAFF, customer ownership และ primary contact updates จาก account จริงผ่าน Backend
