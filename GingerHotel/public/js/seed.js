(function (root) {
  'use strict';
  function seed() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const day = n => new Date(Date.parse(today + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
    const now = today + 'T15:00:00+07:00';
    const stamp = { createdAt: now, updatedAt: now };
    const data = {
      version: 2, now, nextId: 100,
      customers: [
        { id: 1, firstName: 'พิมพ์ชนก', lastName: 'ใจดี', email: 'pim@example.test', phone: '0800000001', active: true, ...stamp },
        { id: 2, firstName: 'ธนกร', lastName: 'สุขใจ', email: 'tan@example.test', phone: '0800000002', active: true, ...stamp }
      ],
      employees: [
        { id: 1, firstName: 'ณัฐ', lastName: 'บริการ', email: 'staff@example.test', phone: '0800000011', role: 'STAFF', jobTitle: 'Front desk', canReviewPayments: true, canReviewCancellations: true, active: true, ...stamp },
        { id: 2, firstName: 'อรุณ', lastName: 'ดูแล', email: 'admin@example.test', phone: '0800000012', role: 'ADMIN', jobTitle: 'Manager', canReviewPayments: true, canReviewCancellations: true, active: true, ...stamp }
      ],
      roomTypes: [
        { id: 1, name: 'Ginger Superior', description: 'ห้องอบอุ่นพร้อมวิวสวน เหมาะสำหรับวันพักผ่อนสบาย ๆ', price: 1500, beds: 1, capacity: 2, size: 28, active: true, ...stamp },
        { id: 2, name: 'Garden Deluxe', description: 'พื้นที่กว้างขึ้น พร้อมมุมนั่งเล่นและแสงธรรมชาติ', price: 2200, beds: 2, capacity: 3, size: 36, active: true, ...stamp },
        { id: 3, name: 'Ginger Family Suite', description: 'ห้องสำหรับครอบครัว ให้ทุกคนได้พักผ่อนด้วยกัน', price: 3400, beds: 2, capacity: 4, size: 52, active: true, ...stamp }
      ],
      rooms: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, number: String(101 + i), typeId: Math.floor(i / 4) + 1, floor: 1, status: i === 11 ? 'MAINTENANCE' : 'AVAILABLE', active: true, ...stamp })),
      services: [
        { id: 1, name: 'อาหารเช้า', description: '1 ชุด / 1 ท่าน / 1 มื้อ', price: 250, active: true, ...stamp },
        { id: 2, name: 'ชุดต้อนรับวันพิเศษ', description: 'ผลไม้และขนม 1 ชุด / ครั้ง', price: 450, active: true, ...stamp },
        { id: 3, name: 'บริการซักรีด', description: '1 ถุง / ครั้ง', price: 180, active: true, ...stamp }
      ],
      promotions: [
        { id: 1, name: 'พักนานอีกนิด ลด 10%', code: 'SLOW10', percent: 10, minNights: 2, minAmount: 3000, startDate: day(-30), endDate: day(365), active: true, ...stamp },
        { id: 2, name: 'วันพักผ่อนของครอบครัว', code: 'FAMILY15', percent: 15, minNights: 3, minAmount: 9000, startDate: day(-30), endDate: day(365), active: true, ...stamp }
      ],
      bookings: [], payments: [], usages: [], stays: [], requests: [], cancellations: [], refunds: [], audit: [], maintenance: [],
    };
    const add = (id, customerId, roomId, start, end, status, paymentStatus) => {
      const room = data.rooms.find(r => r.id === roomId), type = data.roomTypes.find(t => t.id === room.typeId);
      const total = (end - start) * type.price;
      data.bookings.push({ id, code: 'GH-' + String(id).padStart(5, '0'), customerId, employeeId: 1, checkIn: day(start), checkOut: day(end), guests: 2, rooms: [{ roomId, price: type.price, typeName: type.name, number: room.number }], roomTotal: total, discount: 0, serviceTotal: 0, total, status, expiresAt: day(1) + 'T15:00:00+07:00', ...stamp });
      data.payments.push({ id, bookingId: id, amount: total, status: paymentStatus, method: 'BANK_TRANSFER', proof: paymentStatus === 'UNDER_REVIEW' ? 'DEMO' : null, note: 'ข้อมูลตัวอย่าง', ...stamp });
      if (status === 'CHECKED_IN') { room.status = 'OCCUPIED'; data.stays.push({ id, bookingId: id, actualCheckIn: day(start) + 'T15:00:00+07:00', actualCheckOut: null, checkInBy: 1, ...stamp }); }
    };
    add(1, 1, 1, 0, 2, 'CONFIRMED', 'PAID');
    add(2, 2, 5, -2, 0, 'CHECKED_IN', 'PAID');
    add(3, 2, 9, 1, 3, 'PENDING_PAYMENT', 'UNDER_REVIEW');
    return data;
  }
  root.GingerSeed = seed;
  if (typeof module !== 'undefined') module.exports = seed;
})(typeof globalThis !== 'undefined' ? globalThis : window);
