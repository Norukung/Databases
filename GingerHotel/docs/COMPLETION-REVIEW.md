# ตรวจงานเดิมและส่วนที่ทำต่อ

ตรวจวันที่ 12 ตุลาคม 2569

## งานเดิมที่คงไว้

- แบรนด์ Ginger Hotel, HTML/CSS/JavaScript แยกไฟล์, รูปโรงแรมและ responsive layout
- USER ค้นหา/จองหลายห้อง กรอกข้อมูล เลือกบริการ/โปรโมชั่น ตรวจยอด แจ้งชำระ ติดตามและขอยกเลิก
- STAFF Dashboard ตรวจรับเงิน เช็กอิน/เช็กเอาต์ บริการ เตรียมห้อง และรายการจองแทนลูกค้า
- ADMIN จัดการข้อมูลหลัก, API Service Layer, เอกสารนโยบาย, PL/SQL กระบวนการ A–G
- 20 domain tests เดิม ซึ่งรันผ่านก่อนแก้ไข

## งานที่ทำต่อ

- อ่าน Normalize.pdf ที่ผู้ใช้ระบุ และแทน placeholder DDL ด้วยโครงสร้าง 16 ตารางตามภาพจริง
- ปรับชื่อ/ชนิดคอลัมน์ใน Query, Package และ seed ทั้งชุด; ใช้ DELETED_AT เฉพาะ 5 ตารางที่มีเดิม
- ย้ายคอลัมน์เสริม, สถานะ/CHECK, timestamp และ sequence generation ไป Migration แยก
- แก้ SELECT INTO ใน AUTHORIZE ที่เลือก 6 ค่าแต่รับ 5 ค่า
- เปลี่ยน template จัดการข้อมูลหลักเป็น GINGER_MANAGEMENT พร้อม UPDATE_PROFILE, COMMIT/ROLLBACK และ audit
- เพิ่ม install_project.sql ที่หยุดก่อน seed หากพบ compilation error และเพิ่มตรวจ integrity
- เพิ่มหน้าปิดซ่อมล่วงหน้า พร้อมช่วงวันที่ ตารางค้นหา/กรอง/แบ่งหน้า และ API/Mock ที่สัมพันธ์กับ PL/SQL
- เพิ่มการกำหนดสิทธิ์ตรวจชำระ/ยกเลิกของ STAFF ผ่าน ADMIN; ตรวจสิทธิ์ใน Mock ซ้ำและซ่อนปุ่มตามสิทธิ์ปัจจุบัน
- ปรับ badge เปิด/ปิดใช้งานให้สื่อความหมายถูกต้อง และรักษาข้อมูล Demo เก่าเมื่ออัปเกรด
- แก้ปัญหาจองสองแท็บจาก LocalStorage อ่านค่าค้าง โดยเก็บ Mock snapshot ใน IndexedDB transaction เดียว และนำเข้าข้อมูลเก่าโดยไม่ล้างทิ้ง
- เพิ่ม regression tests และแยก browser profile/port ต่อการรัน เพื่อไม่ใช้สถานะค้างจากการรันก่อนหน้า
- ปรับเอกสาร Schema, วิธีรัน SQL, API mapping และผลทดสอบให้ตรงกับงานปัจจุบัน

## ผลส่งมอบและส่วนที่ต้องมีสภาพแวดล้อมเพิ่ม

Frontend Demo และเอกสาร/สคริปต์ในขอบเขตโครงงานมีให้ครบ ผลทดสอบอยู่ใน TESTING.md

ยังไม่ยืนยัน Oracle compilation, transaction isolation/deadlock และ FK บน instance จริง; ต้องนำสคริปต์ไปรันใน Oracle SQL Developer ตาม README การทดสอบสองแท็บพิสูจน์เฉพาะ Mock ไม่ใช่ Oracle

Backend, authentication จริง, private file storage, payment/refund integration และ deployment ไม่ได้พัฒนาในขอบเขต Frontend + SQL + API Contract นี้ จึงไม่อ้างว่ามีการเชื่อม Oracle หรือโอนเงินจริง
