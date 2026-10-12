/* All UI data access goes through HotelService.call(). Set config.mode='api'
   only after implementing docs/API.md. Never add Oracle credentials here. */
(function () {
  'use strict';
  const config = { mode: 'mock', baseUrl: '/api/v1' };
  const storageKey = 'ginger-hotel-demo-v1';
  const routes = {
    login: ['POST','/auth/login'], catalog: ['GET','/catalog'], me: ['GET','/me'], availability: ['GET','/availability'], quote: ['POST','/quotes'], createBooking: ['POST','/bookings'], bookings: ['GET','/bookings'], booking: ['GET','/bookings/:id'], profile: ['PATCH','/me'], submitPayment: ['POST','/bookings/:id/payments'], proof: ['GET','/payments/:id/proof'], reviewPayment: ['POST','/payments/:id/review'], checkIn: ['POST','/bookings/:id/check-in'], checkOut: ['POST','/bookings/:id/check-out'], addService: ['POST','/bookings/:id/services'], useService: ['PATCH','/service-usage/:id'], requestCancellation: ['POST','/bookings/:id/cancellation-requests'], reviewCancellation: ['POST','/cancellation-requests/:id/review'], completeRefund: ['POST','/refunds/:id/complete'], dashboard: ['GET','/dashboard'], listMaster: ['GET','/management/:entity'], saveMaster: ['POST','/management/:entity'], prepareRoom: ['POST','/rooms/:id/prepare'], listMaintenance: ['GET','/maintenance'], scheduleMaintenance: ['POST','/maintenance']
  };
  let session = null, databasePromise, chain = Promise.resolve();
  try { session = JSON.parse(sessionStorage.getItem('ginger-session') || 'null'); } catch { /* disabled storage: in-memory demo */ }
  const upgrade = data => {
    // Preserve existing bookings and proof while upgrading old demo permissions.
    if (data.version < 2) {
      data.employees.forEach(e => { e.canReviewPayments = e.id === 1 || e.role === 'ADMIN'; e.canReviewCancellations = e.canReviewPayments; });
      data.employees.forEach(e => { e.jobTitle ||= e.role === 'ADMIN' ? 'Manager' : 'Front desk'; });
      data.version = 2;
    }
    return data;
  };
  const read = () => { const raw = localStorage.getItem(storageKey); return upgrade(raw ? JSON.parse(raw) : GingerSeed()); };
  function database() {
    if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('ginger-hotel-demo', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('เปิดพื้นที่ข้อมูลสาธิตไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บของเบราว์เซอร์'));
    });
    return databasePromise;
  }
  async function persistentWork(method, payload, reset = false) {
    const db = await database();
    // One readwrite transaction owns read -> validate -> write across ALL tabs.
    // Do not await inside onsuccess: IndexedDB must keep this transaction active.
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite'), store = tx.objectStore('snapshots');
      let result, failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || new Error('บันทึกข้อมูลสาธิตไม่ได้ ข้อมูลเดิมยังไม่เปลี่ยน กรุณาตรวจพื้นที่จัดเก็บ'));
      if (reset) { store.delete(storageKey); return; }
      const request = store.get(storageKey);
      request.onsuccess = () => {
        try {
          // Import old LocalStorage only if this origin has no IndexedDB snapshot.
          const out = GingerDomain.execute(request.result ? upgrade(request.result) : read(), session, method, payload);
          result = out.result; store.put(out.data, storageKey);
        } catch (error) { failure = error; tx.abort(); }
      };
    });
  }
  async function call(method, payload = {}) {
    if (config.mode === 'api') {
      if (method === 'setClock') throw new Error('นาฬิกาสาธิตใช้ในโหมด Mock เท่านั้น');
      const route = routes[method]; if (!route) throw new Error('ไม่พบ API');
      const [verb, path] = route, params = { ...payload }; delete params.id; delete params.entity;
      const url = config.baseUrl + path.replace(':id', encodeURIComponent(payload.id)).replace(':entity', encodeURIComponent(payload.entity)) + (verb === 'GET' && Object.keys(params).length ? '?' + new URLSearchParams(params) : '');
      const response = await fetch(url, { method: verb, credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.GINGER_CSRF_TOKEN || '' }, ...(verb !== 'GET' ? { body: JSON.stringify(payload) } : {}) });
      const body = await response.json(); if (!response.ok) { const error = new Error(body.error?.message || 'เชื่อมต่อระบบไม่สำเร็จ'); error.code = body.error?.code; throw error; }
      if (method === 'login' || method === 'me') session = body.data;
      return body.data;
    }
    const work = async () => {
      let result;
      if (typeof indexedDB !== 'undefined') result = await persistentWork(method, payload);
      else {
        // Legacy single-tab fallback only; cross-tab safety requires IndexedDB.
        const out = GingerDomain.execute(read(), session, method, payload);
        try { localStorage.setItem(storageKey, JSON.stringify(out.data)); } catch { throw new Error('พื้นที่ข้อมูลสาธิตเต็มหรือถูกปิด กรุณาลดขนาดหลักฐานหรือเปิดการจัดเก็บข้อมูลในเบราว์เซอร์'); }
        result = out.result;
      }
      if (method === 'login' || method === 'me') { session = result; sessionStorage.setItem('ginger-session', JSON.stringify(session)); }
      return result;
    };
    const task = () => navigator.locks ? navigator.locks.request(storageKey, work) : work();
    const result = chain.then(task); chain = result.catch(() => {}); return result;
  }
  window.HotelService = { call, config, getSession: () => session, logout: async () => { if (config.mode === 'api') { const r = await fetch(config.baseUrl + '/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': window.GINGER_CSRF_TOKEN || '' } }); if (!r.ok) throw new Error('ออกจากระบบไม่สำเร็จ'); } session = null; sessionStorage.removeItem('ginger-session'); }, reset: async () => {
    if (config.mode !== 'mock') throw new Error('ใช้ได้เฉพาะข้อมูลจำลอง');
    const work = async () => {
      if (typeof indexedDB !== 'undefined') await persistentWork(null, null, true);
      localStorage.removeItem(storageKey); sessionStorage.removeItem('ginger-session'); session = null;
    };
    const task = () => navigator.locks ? navigator.locks.request(storageKey, work) : work();
    const result = chain.then(task); chain = result.catch(() => {}); return result;
  } };
})();
