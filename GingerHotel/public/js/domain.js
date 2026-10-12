/* Pure mock business operations. The real backend MUST enforce equivalent rules.
   No passwords, Oracle credentials or production authentication live here. */
(function (root) {
  'use strict';
  class DomainError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const fail = (ok, code, message) => { if (!ok) throw new DomainError(code, message); };
  const int = n => Number.isInteger(Number(n)) && Number(n) > 0;
  const cents = n => Math.round(Number(n) * 100) / 100;
  const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  const day = d => new Date(d.now).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const nights = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const overlap = (a, b, x, y) => a < y && b > x;
  const stamp = d => ({ createdAt: d.now, updatedAt: d.now });
  const next = d => ++d.nextId;
  const find = (d, table, id) => { const row = d[table].find(x => x.id === Number(id)); fail(row, 'NOT_FOUND', 'ไม่พบรายการที่ต้องการ'); return row; };
  function actor(d, session) {
    fail(session, 'UNAUTHENTICATED', 'กรุณาเข้าสู่โหมดสาธิตก่อน');
    const row = find(d, session.role === 'USER' ? 'customers' : 'employees', session.id);
    fail(row.active, 'FORBIDDEN', 'บัญชีนี้ถูกปิดใช้งาน');
    return { ...row, name: row.firstName, role: session.role === 'USER' ? 'USER' : row.role };
  }
  function staff(d, s) { const a = actor(d, s); fail(['STAFF', 'ADMIN'].includes(a.role), 'FORBIDDEN', 'เฉพาะพนักงานที่ได้รับสิทธิ์'); return a; }
  function reviewer(d, s, permission) { const a = staff(d, s); fail(a.role === 'ADMIN' || a[permission] === true, 'FORBIDDEN', 'บัญชีนี้ไม่ได้รับสิทธิ์พิจารณารายการ'); return a; }
  function own(d, s, b) { const a = actor(d, s); fail(a.role !== 'USER' || a.id === b.customerId, 'NOT_FOUND', 'ไม่พบรายการที่ต้องการ'); return a; }
  const paid = (d, id) => cents(d.payments.filter(p => p.bookingId === id && p.status === 'PAID').reduce((n, p) => n + p.amount, 0));
  const balance = (d, b) => cents(b.total - paid(d, b.id));
  function expire(d) {
    for (const b of d.bookings) if (b.status === 'PENDING_PAYMENT' && new Date(b.expiresAt) <= new Date(d.now) && !d.payments.some(p => p.bookingId === b.id && p.status === 'UNDER_REVIEW')) {
      b.status = 'EXPIRED'; b.updatedAt = d.now;
      d.requests.filter(r => r.bookingId === b.id && r.status === 'PENDING').forEach(r => { r.status = 'REJECTED'; r.note = 'การจองหมดอายุก่อนพิจารณา'; r.updatedAt = d.now; });
      d.usages.filter(u => u.bookingId === b.id && u.status === 'PLANNED').forEach(u => { u.status = 'CANCELLED'; u.updatedAt = d.now; });
    }
  }
  function validateDates(d, p) {
    fail(date(p.checkIn) && date(p.checkOut) && p.checkIn >= day(d) && p.checkOut > p.checkIn && nights(p.checkIn, p.checkOut) <= 30, 'INVALID_DATES', 'เลือกวันเช็กอินตั้งแต่วันนี้ และวันเช็กเอาต์หลังเช็กอิน ไม่เกิน 30 คืน');
  }
  function free(d, room, p) {
    return room.active && room.status !== 'MAINTENANCE' && !d.maintenance.some(m => m.roomId === room.id && overlap(m.startDate, m.endDate, p.checkIn, p.checkOut)) && !d.bookings.some(b =>
      ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'].includes(b.status) && b.rooms.some(r => r.roomId === room.id) &&
      (overlap(b.checkIn, b.checkOut, p.checkIn, p.checkOut) || (b.status === 'CHECKED_IN' && b.checkOut <= day(d) && p.checkIn === day(d))));
  }
  function availability(d, p) {
    expire(d); validateDates(d, p);
    return d.roomTypes.filter(t => t.active && (!p.typeId || t.id === +p.typeId) && (!p.maxPrice || t.price <= +p.maxPrice) && (!p.minCapacity || t.capacity >= +p.minCapacity)).map(t => ({ ...t, availableRooms: d.rooms.filter(r => r.typeId === t.id && free(d, r, p)).map(r => r.id) }));
  }
  function quote(d, p) {
    expire(d); validateDates(d, p);
    fail(Array.isArray(p.roomIds) && p.roomIds.length > 0 && p.roomIds.length <= 10 && new Set(p.roomIds.map(Number)).size === p.roomIds.length, 'INVALID_ROOMS', 'เลือกห้อง 1–10 ห้องและห้ามซ้ำ');
    let capacity = 0;
    const rooms = p.roomIds.map(id => { const r = find(d, 'rooms', id), t = find(d, 'roomTypes', r.typeId); fail(t.active && free(d, r, p), 'ROOM_UNAVAILABLE', 'ห้องที่เลือกไม่ว่างแล้ว กรุณาค้นหาใหม่'); capacity += +t.capacity; return { roomId: r.id, price: +t.price, typeName: t.name, number: r.number }; });
    fail(int(p.guests) && +p.guests <= 999 && +p.guests <= capacity && +p.guests >= rooms.length, 'INVALID_GUESTS', 'จำนวนผู้เข้าพักต้องไม่น้อยกว่าจำนวนห้อง และไม่เกินความจุรวม');
    fail(Array.isArray(p.services || []), 'INVALID_SERVICE', 'ข้อมูลบริการไม่ถูกต้อง');
    const used = new Set();
    const services = (p.services || []).map(item => { const s = find(d, 'services', item.serviceId); fail(s.active && int(item.quantity) && +item.quantity <= 99 && !used.has(s.id), 'INVALID_SERVICE', 'บริการปิดใช้งาน จำนวนไม่ถูกต้อง หรือเลือกรายการซ้ำ'); used.add(s.id); return { serviceId: s.id, name: s.name, quantity: +item.quantity, unitPrice: +s.price }; });
    const roomTotal = cents(rooms.reduce((n, r) => n + r.price * nights(p.checkIn, p.checkOut), 0));
    const serviceTotal = cents(services.reduce((n, s) => n + s.quantity * s.unitPrice, 0));
    const eligiblePromotions = d.promotions.filter(x => x.active && day(d) >= x.startDate && day(d) <= x.endDate && nights(p.checkIn, p.checkOut) >= x.minNights && roomTotal >= x.minAmount);
    const promo = p.promotionId ? eligiblePromotions.find(x => x.id === +p.promotionId) : null;
    fail(!p.promotionId || promo, 'PROMOTION_INELIGIBLE', 'โปรโมชั่นนี้ไม่ผ่านเงื่อนไข');
    const discount = promo ? cents(roomTotal * promo.percent / 100) : 0;
    return { rooms, services, roomTotal, serviceTotal, discount, total: cents(roomTotal + serviceTotal - discount), nights: nights(p.checkIn, p.checkOut), eligiblePromotions, promotionId: promo?.id || null, promotionName: promo?.name || null };
  }
  function bookingView(d, b) { return { ...b, customer: find(d, 'customers', b.customerId), payments: d.payments.filter(p => p.bookingId === b.id).map(p => ({ ...p, proof: p.proof ? true : null })), usages: d.usages.filter(u => u.bookingId === b.id), stays: d.stays.filter(x => x.bookingId === b.id), requests: d.requests.filter(x => x.bookingId === b.id), cancellations: d.cancellations.filter(x => x.bookingId === b.id), refunds: d.refunds.filter(x => x.bookingId === b.id), paid: paid(d, b.id), balance: balance(d, b) }; }
  const methods = {
    catalog(d) { expire(d); return { roomTypes: d.roomTypes.filter(x => x.active), services: d.services.filter(x => x.active), promotions: d.promotions.filter(x => x.active), now: d.now }; },
    login(d, s, p) { const role = p.role; fail(['USER','STAFF','ADMIN'].includes(role), 'INVALID_ROLE', 'บทบาทไม่ถูกต้อง'); const user = find(d, role === 'USER' ? 'customers' : 'employees', p.id || (role === 'ADMIN' ? 2 : 1)); fail(user.active && (role === 'USER' || user.role === role), 'FORBIDDEN', 'บัญชีนี้ใช้งานไม่ได้'); return actor(d, { id: user.id, role }); },
    availability(d, s, p) { return availability(d, p); },
    quote(d, s, p) { return quote(d, p); },
    createBooking(d, s, p) {
      const a = actor(d, s), customerId = a.role === 'USER' ? a.id : +p.customerId;
      fail(find(d, 'customers', customerId).active, 'INVALID_CUSTOMER', 'ข้อมูลลูกค้าไม่พร้อมใช้งาน');
      fail(p.accepted === true, 'POLICY_REQUIRED', 'กรุณายอมรับเงื่อนไขการเข้าพัก');
      const q = quote(d, p), id = next(d);
      fail(p.expectedTotal == null || cents(p.expectedTotal) === q.total, 'PRICE_CHANGED', 'ราคาเปลี่ยนแล้ว กรุณาตรวจสอบยอดใหม่ก่อนยืนยัน');
      const b = { id, code: 'GH-' + String(id).padStart(5, '0'), customerId, employeeId: a.role === 'USER' ? null : a.id, checkIn: p.checkIn, checkOut: p.checkOut, guests: +p.guests, rooms: q.rooms, roomTotal: q.roomTotal, serviceTotal: q.serviceTotal, discount: q.discount, total: q.total, promotionId: q.promotionId, promotionName: q.promotionName, status: 'PENDING_PAYMENT', expiresAt: new Date(Date.parse(d.now) + 86400000).toISOString(), ...stamp(d) };
      d.bookings.push(b);
      for (const u of q.services) d.usages.push({ id: next(d), bookingId: id, ...u, usageDate: b.checkIn + 'T00:00:00+07:00', recordedBy: a.role === 'USER' ? null : a.id, status: 'PLANNED', ...stamp(d) });
      d.payments.push({ id: next(d), bookingId: id, amount: b.total, method: null, proof: null, status: 'PENDING', ...stamp(d) });
      return bookingView(d, b);
    },
    bookings(d, s) { expire(d); const a = actor(d, s); return d.bookings.filter(b => a.role !== 'USER' || b.customerId === a.id).map(b => bookingView(d, b)).reverse(); },
    booking(d, s, p) { expire(d); const b = find(d, 'bookings', p.id); own(d, s, b); return bookingView(d, b); },
    submitPayment(d, s, p) {
      expire(d); const b = find(d, 'bookings', p.id); own(d, s, b);
      fail(['PENDING_PAYMENT','CONFIRMED','CHECKED_IN'].includes(b.status) && balance(d, b) > 0, 'INVALID_STATE', 'รายการนี้ไม่มียอดที่แจ้งชำระได้');
      fail(!d.payments.some(x => x.bookingId === b.id && x.status === 'UNDER_REVIEW'), 'PAYMENT_DUPLICATE', 'มีหลักฐานรอตรวจสอบอยู่แล้ว');
      fail(['BANK_TRANSFER','PROMPTPAY'].includes(p.method), 'INVALID_PAYMENT', 'เลือกวิธีชำระเงิน');
      fail(Number.isFinite(+p.amount) && cents(p.amount) === balance(d, b), 'AMOUNT_MISMATCH', 'ยอดแจ้งชำระต้องเท่ากับยอดค้างทั้งหมด');
      fail(p.proof && /^data:image\/(png|jpeg);base64,/.test(p.proof) && p.proof.length <= 1400000, 'INVALID_FILE', 'หลักฐานต้องเป็น PNG หรือ JPEG ขนาดไม่เกิน 1 MB');
      let payment = d.payments.find(x => x.bookingId === b.id && x.status === 'PENDING');
      if (!payment) { payment = { id: next(d), bookingId: b.id, ...stamp(d) }; d.payments.push(payment); }
      Object.assign(payment, { amount: cents(p.amount), method: p.method, proof: p.proof, status: 'UNDER_REVIEW', submittedAt: d.now, updatedAt: d.now });
      return { id: payment.id, status: payment.status };
    },
    proof(d, s, p) { const pay = find(d, 'payments', p.id); own(d, s, find(d, 'bookings', pay.bookingId)); return { proof: pay.proof }; },
    reviewPayment(d, s, p) {
      const a = reviewer(d, s, 'canReviewPayments'), pay = find(d, 'payments', p.id), b = find(d, 'bookings', pay.bookingId);
      fail(pay.status === 'UNDER_REVIEW' && pay.proof, 'PAYMENT_DUPLICATE', 'รายการไม่ได้อยู่ระหว่างตรวจสอบ หรือดำเนินการแล้ว');
      fail(['PENDING_PAYMENT','CONFIRMED','CHECKED_IN'].includes(b.status), 'INVALID_STATE', 'สถานะการจองไม่อนุญาต');
      fail(['APPROVE','REJECT'].includes(p.decision), 'INVALID_INPUT', 'เลือกผลพิจารณา');
      if (p.decision === 'APPROVE') { fail(+p.verifiedAmount === pay.amount && pay.amount === balance(d, b), 'AMOUNT_MISMATCH', 'ยอดที่ตรวจพบไม่ตรงกับหลักฐานหรือยอดค้าง'); pay.status = 'PAID'; pay.paidAt = d.now; if (b.status === 'PENDING_PAYMENT') b.status = 'CONFIRMED'; }
      else { fail(p.note?.trim() && p.note.length <= 500, 'REASON_REQUIRED', 'ระบุเหตุผลที่ปฏิเสธไม่เกิน 500 ตัวอักษร'); pay.status = 'REJECTED'; if (b.status === 'PENDING_PAYMENT') b.expiresAt = new Date(Date.parse(d.now) + 2 * 3600000).toISOString(); }
      Object.assign(pay, { reviewedBy: a.id, reviewedAt: d.now, note: p.note || '', updatedAt: d.now }); b.updatedAt = d.now;
      return bookingView(d, b);
    },
    checkIn(d, s, p) {
      const a = staff(d, s), b = find(d, 'bookings', p.id);
      fail(b.status === 'CONFIRMED' && !d.stays.some(x => x.bookingId === b.id), 'INVALID_STATE', 'ต้องยืนยันการจองก่อน และเช็กอินได้ครั้งเดียว');
      fail(day(d) === b.checkIn && new Date(d.now).getTime() >= Date.parse(b.checkIn + 'T14:00:00+07:00'), 'INVALID_CHECKIN_DATE', 'เช็กอินได้ในวันเข้าพัก ตั้งแต่ 14:00 น.');
      fail(balance(d, b) === 0, 'OUTSTANDING_BALANCE', 'ต้องชำระยอดค้างก่อนเช็กอิน');
      fail(!d.maintenance.some(m => b.rooms.some(r => r.roomId === m.roomId) && overlap(m.startDate, m.endDate, b.checkIn, b.checkOut)), 'ROOM_NOT_READY', 'ห้องอยู่ในช่วงปิดซ่อม');
      for (const br of b.rooms) { const r = find(d, 'rooms', br.roomId); fail(r.active && r.status === 'AVAILABLE' && !d.stays.some(st => !st.actualCheckOut && find(d, 'bookings', st.bookingId).rooms.some(x => x.roomId === r.id)), 'ROOM_NOT_READY', 'ทุกห้องต้องพร้อมและไม่มีผู้เข้าพักอยู่'); r.status = 'OCCUPIED'; r.updatedAt = d.now; }
      d.stays.push({ id: next(d), bookingId: b.id, actualCheckIn: d.now, actualCheckOut: null, checkInBy: a.id, ...stamp(d) }); b.status = 'CHECKED_IN'; b.updatedAt = d.now;
      return bookingView(d, b);
    },
    checkOut(d, s, p) {
      const a = staff(d, s), b = find(d, 'bookings', p.id), stay = d.stays.find(x => x.bookingId === b.id && !x.actualCheckOut);
      fail(b.status === 'CHECKED_IN' && stay, 'INVALID_STATE', 'รายการนี้ไม่ได้เช็กอิน หรือเช็กเอาต์ไปแล้ว');
      fail(balance(d, b) === 0, 'OUTSTANDING_BALANCE', 'มียอดค้าง ต้องตรวจรับชำระก่อนเช็กเอาต์');
      fail(!d.usages.some(u => u.bookingId === b.id && u.status === 'PLANNED'), 'SERVICE_UNRESOLVED', 'กรุณาระบุบริการที่วางแผนไว้ว่าใช้จริงหรือยกเลิกก่อน');
      Object.assign(stay, { actualCheckOut: d.now, checkOutBy: a.id, updatedAt: d.now }); b.status = 'CHECKED_OUT'; b.updatedAt = d.now;
      b.rooms.forEach(br => { const r = find(d, 'rooms', br.roomId); r.status = 'CLEANING'; r.updatedAt = d.now; }); return bookingView(d, b);
    },
    addService(d, s, p) {
      const a = staff(d, s), b = find(d, 'bookings', p.id), service = find(d, 'services', p.serviceId);
      fail(['CONFIRMED','CHECKED_IN'].includes(b.status) && service.active && int(p.quantity) && +p.quantity <= 99, 'INVALID_SERVICE', 'บริการ จำนวน หรือสถานะการจองไม่ถูกต้อง');
      fail(!d.payments.some(x => x.bookingId === b.id && x.status === 'UNDER_REVIEW'), 'PAYMENT_UNDER_REVIEW', 'กรุณาตรวจรับหลักฐานที่ค้างก่อนเพิ่มบริการและเปลี่ยนยอด');
      fail(['PLANNED','USED'].includes(p.status) && (p.status !== 'USED' || b.status === 'CHECKED_IN'), 'INVALID_STATE', 'บันทึกใช้จริงได้เมื่อเช็กอินแล้ว');
      const amount = cents(service.price * p.quantity);
      d.usages.push({ id: next(d), bookingId: b.id, serviceId: service.id, name: service.name, quantity: +p.quantity, unitPrice: +service.price, usageDate: p.status === 'USED' ? d.now : b.checkIn + 'T00:00:00+07:00', recordedBy: a.id, status: p.status, ...stamp(d) }); b.serviceTotal = cents(b.serviceTotal + amount); b.total = cents(b.total + amount); b.updatedAt = d.now; return bookingView(d, b);
    },
    useService(d, s, p) {
      const a = staff(d, s), u = find(d, 'usages', p.id), b = find(d, 'bookings', u.bookingId);
      fail(u.status === 'PLANNED' && b.status === 'CHECKED_IN', 'INVALID_STATE', 'ต้องเช็กอินแล้ว และบริการยังไม่ได้ใช้');
      // Prepaid planned services remain billed if cancelled (disclosed non-refundable package).
      fail(['USED','CANCELLED'].includes(p.status), 'INVALID_STATE', 'สถานะบริการไม่ถูกต้อง');
      u.status = p.status; if (p.status === 'USED') u.usageDate = d.now; u.recordedBy = a.id; u.updatedAt = d.now; return bookingView(d, b);
    },
    requestCancellation(d, s, p) {
      expire(d); const b = find(d, 'bookings', p.id); own(d, s, b);
      fail(['PENDING_PAYMENT','CONFIRMED'].includes(b.status), 'INVALID_STATE', 'ขอยกเลิกได้ก่อนเช็กอินเท่านั้น');
      fail(!d.requests.some(r => r.bookingId === b.id && r.status === 'PENDING'), 'CANCELLATION_DUPLICATE', 'ส่งคำขอยกเลิกแล้ว');
      fail(p.reason?.trim() && p.reason.length <= 500, 'REASON_REQUIRED', 'กรุณาระบุเหตุผลไม่เกิน 500 ตัวอักษร');
      d.requests.push({ id: next(d), bookingId: b.id, reason: p.reason.trim(), status: 'PENDING', ...stamp(d) }); return bookingView(d, b);
    },
    reviewCancellation(d, s, p) {
      expire(d);
      const a = reviewer(d, s, 'canReviewCancellations'), req = find(d, 'requests', p.id), b = find(d, 'bookings', req.bookingId);
      fail(req.status === 'PENDING' && ['PENDING_PAYMENT','CONFIRMED'].includes(b.status), 'INVALID_STATE', 'คำขอถูกพิจารณาแล้ว หรือสถานะไม่อนุญาต');
      fail(['APPROVE','REJECT'].includes(p.decision) && p.note?.trim() && p.note.length <= 500, 'REASON_REQUIRED', 'เลือกผลและระบุเหตุผลการพิจารณา');
      fail(!d.payments.some(x => x.bookingId === b.id && x.status === 'UNDER_REVIEW'), 'PAYMENT_UNDER_REVIEW', 'ตรวจสอบยอดชำระก่อนพิจารณายกเลิก');
      req.status = p.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'; req.reviewedBy = a.id; req.reviewedAt = d.now; req.note = p.note; req.updatedAt = d.now;
      if (p.decision === 'APPROVE') {
        const refundAmount = Date.parse(b.checkIn + 'T14:00:00+07:00') - Date.parse(req.createdAt) >= 48 * 3600000 ? paid(d, b.id) : 0;
        b.status = 'CANCELLED'; b.updatedAt = d.now;
        const cancellationId = next(d); d.cancellations.push({ id: cancellationId, bookingId: b.id, reason: req.reason, refundAmount, employeeId: a.id, ...stamp(d) });
        if (refundAmount > 0) d.refunds.push({ id: next(d), bookingId: b.id, cancellationId, amount: refundAmount, status: 'PENDING', ...stamp(d) });
        d.usages.filter(u => u.bookingId === b.id && u.status === 'PLANNED').forEach(u => { u.status = 'CANCELLED'; u.updatedAt = d.now; });
      }
      return bookingView(d, b);
    },
    completeRefund(d, s, p) { const a = staff(d, s); fail(a.role === 'ADMIN', 'FORBIDDEN', 'เฉพาะผู้ดูแลระบบ'); const r = find(d, 'refunds', p.id); fail(r.status === 'PENDING' && p.reference?.trim() && p.reference.length <= 100, 'INVALID_STATE', 'ระบุเลขอ้างอิง และห้ามคืนเงินซ้ำ'); Object.assign(r, { status: 'REFUNDED', reference: p.reference, completedBy: a.id, completedAt: d.now, updatedAt: d.now }); return r; },
    dashboard(d, s) { staff(d, s); expire(d); return { today: day(d), checkIns: d.bookings.filter(b => b.checkIn === day(d) && b.status === 'CONFIRMED').length, checkOuts: d.bookings.filter(b => b.checkOut <= day(d) && b.status === 'CHECKED_IN').length, reviews: d.payments.filter(p => p.status === 'UNDER_REVIEW').length, cancellations: d.requests.filter(r => r.status === 'PENDING').length, rooms: d.rooms, stays: d.stays, customers: d.customers, audit: d.audit }; },
    listMaster(d, s, p) { const a = staff(d, s); fail(['rooms','roomTypes','services','promotions','customers','employees'].includes(p.entity), 'INVALID_INPUT', 'ตารางไม่ถูกต้อง'); fail(a.role === 'ADMIN' || ['rooms','customers'].includes(p.entity), 'FORBIDDEN', 'เฉพาะผู้ดูแลระบบ'); return d[p.entity]; },
    saveMaster(d, s, p) {
      const a = staff(d, s), entity = p.entity;
      fail(['rooms','roomTypes','services','promotions','customers','employees'].includes(entity), 'INVALID_INPUT', 'ตารางไม่ถูกต้อง');
      fail(a.role === 'ADMIN' || (entity === 'customers' && !p.id), 'FORBIDDEN', 'เฉพาะผู้ดูแลระบบ');
      const src = p.values || {}, v = {}, requiredText = key => { fail(typeof src[key] === 'string' && src[key].trim().length > 0 && src[key].length <= ({firstName:100,lastName:100,email:255,phone:20,jobTitle:100,number:20,code:40}[key] || 200), 'INVALID_INPUT', 'กรอกข้อมูลให้ครบและไม่ยาวเกินกำหนด'); v[key] = src[key].trim(); };
      const positive = key => { fail(Number.isFinite(+src[key]) && +src[key] > 0 && +src[key] <= 999999, 'INVALID_INPUT', 'จำนวนหรือราคาต้องมากกว่า 0'); v[key] = +src[key]; };
      v.active = src.active !== false;
      if (['customers','employees'].includes(entity)) { ['firstName','lastName','email','phone'].forEach(requiredText); fail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) && /^[0-9+ -]{8,20}$/.test(v.phone), 'INVALID_INPUT', 'อีเมลหรือโทรศัพท์ไม่ถูกต้อง'); }
      if (entity === 'employees') { fail(['STAFF','ADMIN'].includes(src.role), 'INVALID_ROLE', 'บทบาทไม่ถูกต้อง'); v.role = src.role; requiredText('jobTitle'); v.canReviewPayments = src.canReviewPayments === true; v.canReviewCancellations = src.canReviewCancellations === true; fail(!(a.id === +p.id && (!v.active || v.role !== 'ADMIN')), 'SELF_LOCKOUT', 'ไม่สามารถปิดหรือลดสิทธิ์บัญชีของตนเอง'); }
      if (['roomTypes','services','promotions'].includes(entity)) { requiredText('name'); fail(v.name.length <= (entity === 'roomTypes' ? 100 : 150), 'INVALID_INPUT', 'ชื่อยาวเกินขนาดคอลัมน์'); }
      if (['roomTypes','services'].includes(entity)) { positive('price'); fail(cents(v.price) === v.price, 'INVALID_INPUT', 'ราคามีทศนิยมได้ไม่เกิน 2 ตำแหน่ง'); v.description = String(src.description || ''); fail(v.description.length <= (entity === 'roomTypes' ? 500 : 1000), 'INVALID_INPUT', 'รายละเอียดยาวเกินขนาดคอลัมน์'); }
      if (entity === 'roomTypes') { ['beds','capacity','size'].forEach(positive); fail(int(v.beds) && int(v.capacity) && v.capacity >= v.beds && v.capacity <= 999 && v.beds <= 999 && v.size <= 9999.99, 'INVALID_INPUT', 'จำนวนเตียงและความจุต้องเป็นจำนวนเต็ม'); }
      if (entity === 'rooms') {
        requiredText('number'); positive('typeId'); positive('floor'); fail(int(v.floor) && v.floor <= 999 && v.number.length <= 20, 'INVALID_INPUT', 'ชั้นต้องเป็นจำนวนเต็ม 1–999 และหมายเลขห้องไม่เกิน 20 ตัวอักษร'); find(d, 'roomTypes', v.typeId); expire(d);
        fail(!d.rooms.some(r => r.number === v.number && r.id !== +p.id), 'DUPLICATE_ROOM', 'หมายเลขห้องซ้ำ');
        fail(['AVAILABLE','CLEANING','MAINTENANCE'].includes(src.status) || (p.id && src.status === find(d, 'rooms', p.id).status), 'INVALID_STATE', 'สถานะไม่ถูกต้อง'); v.status = src.status;
        if (p.id) { const old = find(d, 'rooms', p.id); const blocked = d.bookings.some(b => ['PENDING_PAYMENT','CONFIRMED','CHECKED_IN'].includes(b.status) && b.rooms.some(r => r.roomId === old.id)); fail(!blocked || (v.active && v.status === old.status && v.typeId === old.typeId && v.number === old.number), 'ROOM_ALLOCATED', 'ห้องมีการจองอยู่ ไม่สามารถเปลี่ยนประเภท ปิดใช้ หรือเปลี่ยนสถานะ'); }
      }
      if (entity === 'promotions') { requiredText('code'); ['percent','minNights'].forEach(positive); fail(v.percent < 100 && cents(v.percent) === v.percent && int(v.minNights) && v.minNights <= 999 && Number.isFinite(+src.minAmount) && +src.minAmount >= 0 && date(src.startDate) && date(src.endDate) && src.startDate <= src.endDate, 'INVALID_PROMOTION', 'ส่วนลดต้องน้อยกว่า 100% และเงื่อนไขต้องถูกต้อง'); Object.assign(v, { minAmount: +src.minAmount, startDate: src.startDate, endDate: src.endDate }); fail(!d.promotions.some(x => x.code === v.code && x.id !== +p.id), 'DUPLICATE_CODE', 'รหัสโปรโมชั่นซ้ำ'); }
      let row; if (p.id) { row = find(d, entity, p.id); Object.assign(row, v, { updatedAt: d.now }); } else { row = { id: next(d), ...v, ...stamp(d) }; d[entity].push(row); } return row;
    },
    prepareRoom(d, s, p) { staff(d, s); const r = find(d, 'rooms', p.id); fail(r.status === 'CLEANING' && !d.stays.some(st => !st.actualCheckOut && find(d, 'bookings', st.bookingId).rooms.some(x => x.roomId === r.id)), 'INVALID_STATE', 'ต้องเป็นห้องที่รอทำความสะอาดและไม่มีผู้เข้าพัก'); r.status = 'AVAILABLE'; r.updatedAt = d.now; return r; },
    profile(d, s, p) { const a = actor(d, s); fail(a.role === 'USER', 'FORBIDDEN', 'สำหรับลูกค้า'); const c = find(d, 'customers', a.id); fail(p.firstName?.trim() && p.lastName?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) && /^[0-9+ -]{8,20}$/.test(p.phone), 'INVALID_INPUT', 'กรอกชื่อ อีเมล และเบอร์โทรให้ถูกต้อง'); ['firstName','lastName','email','phone'].forEach(k => { fail(p[k].length <= ({firstName:100,lastName:100,email:255,phone:20}[k]), 'INVALID_INPUT', 'ข้อมูลยาวเกินขนาดคอลัมน์'); c[k] = p[k].trim(); }); c.updatedAt = d.now; return c; },
    listMaintenance(d, s) { staff(d, s); return d.maintenance.map(m => ({ ...m, roomNumber: find(d, 'rooms', m.roomId).number, status: m.endDate <= day(d) ? 'COMPLETED' : m.startDate <= day(d) ? 'IN_PROGRESS' : 'SCHEDULED' })); },
    scheduleMaintenance(d, s, p) {
      const a = staff(d, s); fail(a.role === 'ADMIN', 'FORBIDDEN', 'เฉพาะผู้ดูแลระบบ'); expire(d);
      const room = find(d, 'rooms', p.roomId);
      fail(date(p.startDate) && date(p.endDate) && p.startDate >= day(d) && p.endDate > p.startDate, 'INVALID_DATES', 'วันสิ้นสุดต้องหลังวันเริ่ม และเริ่มตั้งแต่วันนี้');
      fail(typeof p.reason === 'string' && p.reason.trim() && p.reason.length <= 500, 'REASON_REQUIRED', 'ระบุเหตุผลไม่เกิน 500 ตัวอักษร');
      fail(!d.bookings.some(b => ['PENDING_PAYMENT','CONFIRMED','CHECKED_IN'].includes(b.status) && b.rooms.some(r => r.roomId === room.id) && (overlap(b.checkIn,b.checkOut,p.startDate,p.endDate) || (b.status === 'CHECKED_IN' && b.checkOut <= day(d) && p.startDate === day(d)))), 'ROOM_ALLOCATED', 'ช่วงซ่อมทับกับการจองหรือผู้เข้าพักที่ยังไม่เช็กเอาต์');
      fail(!d.maintenance.some(m => m.roomId === room.id && overlap(m.startDate,m.endDate,p.startDate,p.endDate)), 'MAINTENANCE_OVERLAP', 'ช่วงปิดซ่อมทับกับรายการเดิม');
      const row = { id: next(d), roomId: room.id, startDate: p.startDate, endDate: p.endDate, reason: p.reason.trim(), createdBy: a.id, ...stamp(d) }; d.maintenance.push(row); return row;
    },
    me(d, s) { return actor(d, s); },
    setClock(d, s, p) { fail(!isNaN(Date.parse(p.now)) && Date.parse(p.now) >= Date.parse(d.now), 'INVALID_DATE', 'เวลาสาธิตเลื่อนไปข้างหน้าได้เท่านั้น'); d.now = new Date(p.now).toISOString(); expire(d); return { now: d.now }; }
  };
  function execute(data, session, method, payload = {}) {
    fail(methods[method], 'NOT_FOUND', 'ไม่พบคำสั่ง');
    const copy = JSON.parse(JSON.stringify(data));
    const result = methods[method](copy, session, payload);
    if (!['catalog','login','availability','quote','bookings','booking','proof','dashboard','listMaster','listMaintenance','me'].includes(method)) copy.audit.push({ id: next(copy), action: method, actor: session ? `${session.role}:${session.id}` : 'DEMO', targetId: payload.id || result?.id, at: copy.now });
    return { data: copy, result: JSON.parse(JSON.stringify(result)) };
  }
  const exported = { execute, DomainError, nights, overlap, paid, balance };
  root.GingerDomain = exported;
  if (typeof module !== 'undefined') module.exports = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window);
