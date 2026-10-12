# ภาพประกอบโครงงาน

ใช้ built-in imagegen สร้างใหม่ ภาพไม่ใช่โรงแรมจริงและไม่มีการนำภาพโรงแรมจาก Booking.com มาใช้ หน้าเว็บไซต์ติดป้าย “ภาพประกอบสาธิต สร้างด้วย AI” รูปห้องใช้เป็นภาพบรรยากาศร่วม ไม่อ้างว่าเป็นภาพจริงของห้องทั้งสามประเภท

ไฟล์สุดท้าย:

- `public/assets/hotel.png` — ภาพโรงแรมและสระว่ายน้ำ
- `public/assets/room.png` — ภาพห้องพักโทนไม้
- `public/assets/favicon.svg` — โลโก้ g วาดด้วย SVG ของโครงงาน

Prompt โรงแรม:

> Use case: photorealistic-natural. Asset type: website hero photograph for a fictional boutique hotel in Chiang Mai, Thailand called Ginger Hotel. Primary request: a beautiful warm contemporary Thai boutique hotel courtyard, low-rise cream and wood architecture, lush tropical plants, calm emerald swimming pool in foreground, large glass windows revealing cozy rooms, morning sunlight, welcoming premium but accessible three-star hotel. Professional architectural photography, wide landscape 3:2 composition, natural colors, no people, no text, no logos, no watermark. This image will be clearly labeled as an illustrative demo photograph on a student hotel booking website.

Prompt ห้องพัก:

> Use case: photorealistic-natural. Website room photograph for fictional Ginger Hotel boutique hotel in Chiang Mai Thailand. Spacious warm modern guest bedroom, one king bed in white linen, honey-colored teak headboard and furniture, subtle Thai woven textiles, cream walls, large windows with lush green garden view, morning natural light, calm airy inviting atmosphere, professional realistic interior architecture photography, wide landscape 3:2, no people, no text, no logos, no watermark. Illustrative demo hotel room image.

Generated files ถูกคัดลอกเข้าสู่ workspace แล้ว เว็บไม่อ้างอิง path ภายนอกโครงงานและไม่ต้องดาวน์โหลดภาพจากเครือข่าย
