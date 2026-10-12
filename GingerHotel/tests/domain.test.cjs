const {test}=require('node:test');
const assert=require('node:assert/strict');
const seed=require('../public/js/seed.js');
const domain=require('../public/js/domain.js');
const user={id:1,role:'USER'},other={id:2,role:'USER'},staff={id:1,role:'STAFF'},admin={id:2,role:'ADMIN'};
function harness(){let data=seed();const run=(s,m,p)=>{const out=domain.execute(data,s,m,p);data=out.data;return out.result;};return{run,get data(){return data;}};}
function request(h,extra={}){const today=h.data.now.slice(0,10);return {checkIn:today,checkOut:new Date(Date.parse(today)+2*86400000).toISOString().slice(0,10),roomIds:[2,3],guests:4,services:[],accepted:true,...extra};}
const proof='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
function pay(h,b){const p=h.run(user,'submitPayment',{id:b.id,amount:b.balance,method:'BANK_TRANSFER',proof});return h.run(staff,'reviewPayment',{id:p.id,decision:'APPROVE',verifiedAmount:b.balance});}
test('invalid dates including nonexistent calendar day are rejected',()=>{const h=harness();for(const p of [{checkOut:h.data.now.slice(0,10)},{checkIn:'2027-02-30',checkOut:'2027-03-04'},{checkIn:'2000-01-01'}])assert.throws(()=>h.run(user,'createBooking',request(h,p)),{code:'INVALID_DATES'});assert.equal(h.data.bookings.length,3);});
test('multi-room booking snapshots rates, services and discount atomically',()=>{const h=harness(),b=h.run(user,'createBooking',request(h,{services:[{serviceId:1,quantity:2}],promotionId:1}));assert.equal(b.rooms.length,2);assert.equal(b.total,5900);assert.equal(b.usages[0].status,'PLANNED');assert.equal(h.data.rooms.find(r=>r.id===2).status,'AVAILABLE');h.run(admin,'saveMaster',{entity:'services',id:1,values:{name:'Breakfast',price:300,active:true}});assert.equal(h.run(user,'booking',{id:b.id}).usages[0].unitPrice,250);});
test('duplicate rooms and capacity overflows reject whole booking',()=>{const h=harness();assert.throws(()=>h.run(user,'createBooking',request(h,{roomIds:[2,2]})),{code:'INVALID_ROOMS'});assert.throws(()=>h.run(user,'createBooking',request(h,{guests:5})),{code:'INVALID_GUESTS'});assert.equal(h.data.bookings.length,3);});
test('overlapping competing reservations: one succeeds, loser changes nothing',async()=>{const h=harness(),p=request(h);const results=await Promise.allSettled([Promise.resolve().then(()=>h.run(user,'createBooking',p)),Promise.resolve().then(()=>h.run(other,'createBooking',p))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'ROOM_UNAVAILABLE');assert.equal(h.data.bookings.length,4);});
test('adjacent check-out / check-in dates do not overlap',()=>{assert.equal(domain.overlap('2026-12-01','2026-12-03','2026-12-03','2026-12-05'),false);const h=harness(),p=request(h);h.run(user,'createBooking',p);const b=h.run(user,'createBooking',{...p,checkIn:p.checkOut,checkOut:new Date(Date.parse(p.checkOut)+86400000).toISOString().slice(0,10)});assert.equal(b.rooms.length,2);});
test('current OCCUPIED is not the only future availability criterion',()=>{const h=harness(),p=request(h,{checkIn:new Date(Date.parse(h.data.now)+5*86400000).toISOString().slice(0,10),checkOut:new Date(Date.parse(h.data.now)+6*86400000).toISOString().slice(0,10)});assert(h.run(null,'availability',p).find(t=>t.id===2).availableRooms.includes(5));});
test('customer cannot read, pay or cancel another customer booking',()=>{const h=harness();for(const m of ['booking','submitPayment','requestCancellation'])assert.throws(()=>h.run(user,m,{id:3,reason:'test'}),{code:'NOT_FOUND'});assert.equal(h.run(user,'bookings').length,1);});
test('anonymous write and staff master modification denied',()=>{const h=harness();assert.throws(()=>h.run(null,'createBooking',request(h)),{code:'UNAUTHENTICATED'});assert.throws(()=>h.run(staff,'saveMaster',{entity:'employees',id:2,values:{role:'STAFF'}}),{code:'FORBIDDEN'});assert.throws(()=>h.run(user,'checkIn',{id:1}),{code:'FORBIDDEN'});});
test('proof remains UNDER_REVIEW and duplicate submission or approval fails',()=>{const h=harness(),b=h.run(user,'createBooking',request(h)),p=h.run(user,'submitPayment',{id:b.id,amount:b.total,method:'PROMPTPAY',proof});assert.equal(h.run(user,'booking',{id:b.id}).status,'PENDING_PAYMENT');assert.throws(()=>h.run(user,'submitPayment',{id:b.id,amount:b.total,method:'PROMPTPAY',proof}),{code:'PAYMENT_DUPLICATE'});assert.throws(()=>h.run(staff,'reviewPayment',{id:p.id,decision:'APPROVE',verifiedAmount:1}),{code:'AMOUNT_MISMATCH'});h.run(staff,'reviewPayment',{id:p.id,decision:'APPROVE',verifiedAmount:b.total});assert.throws(()=>h.run(staff,'reviewPayment',{id:p.id,decision:'APPROVE',verifiedAmount:b.total}),{code:'PAYMENT_DUPLICATE'});});
test('rejection requires a reason and preserves immutable payment history on resubmit',()=>{const h=harness(),b=h.run(user,'createBooking',request(h)),p=h.run(user,'submitPayment',{id:b.id,amount:b.total,method:'PROMPTPAY',proof});assert.throws(()=>h.run(staff,'reviewPayment',{id:p.id,decision:'REJECT'}),{code:'REASON_REQUIRED'});h.run(staff,'reviewPayment',{id:p.id,decision:'REJECT',note:'ยอดไม่ตรง'});h.run(user,'submitPayment',{id:b.id,amount:b.total,method:'PROMPTPAY',proof});assert.equal(h.run(user,'booking',{id:b.id}).payments.length,2);});
test('check-in and check-out cannot repeat; checkout leaves CLEANING',()=>{const h=harness(),b=h.run(user,'createBooking',request(h));pay(h,b);h.run(staff,'checkIn',{id:b.id});assert.throws(()=>h.run(staff,'checkIn',{id:b.id}),{code:'INVALID_STATE'});h.run(staff,'checkOut',{id:b.id});assert.throws(()=>h.run(staff,'checkOut',{id:b.id}),{code:'INVALID_STATE'});assert.equal(h.data.rooms.find(r=>r.id===2).status,'CLEANING');h.run(staff,'prepareRoom',{id:2});assert.equal(h.data.rooms.find(r=>r.id===2).status,'AVAILABLE');});
test('one unready room rolls back entire check-in',()=>{const h=harness(),b=h.run(user,'createBooking',request(h));pay(h,b);h.data.rooms.find(r=>r.id===3).status='CLEANING';assert.throws(()=>h.run(staff,'checkIn',{id:b.id}),{code:'ROOM_NOT_READY'});assert.equal(h.data.rooms.find(r=>r.id===2).status,'AVAILABLE');assert.equal(h.data.stays.filter(s=>s.bookingId===b.id).length,0);});
test('new service creates balance and blocks checkout without rewriting PAID',()=>{const h=harness(),b=h.run(user,'createBooking',request(h));pay(h,b);h.run(staff,'checkIn',{id:b.id});const updated=h.run(staff,'addService',{id:b.id,serviceId:3,quantity:1,status:'USED'});assert.equal(updated.balance,180);assert.equal(updated.payments.find(p=>p.status==='PAID').amount,b.total);assert.throws(()=>h.run(staff,'checkOut',{id:b.id}),{code:'OUTSTANDING_BALANCE'});pay(h,updated);assert.equal(h.run(staff,'checkOut',{id:b.id}).status,'CHECKED_OUT');});
test('planned services must be resolved and keep agreed unit price',()=>{const h=harness(),b=h.run(user,'createBooking',request(h,{services:[{serviceId:1,quantity:2}]}));pay(h,b);h.run(staff,'checkIn',{id:b.id});assert.throws(()=>h.run(staff,'checkOut',{id:b.id}),{code:'SERVICE_UNRESOLVED'});h.run(staff,'useService',{id:b.usages[0].id,status:'USED'});assert.equal(h.run(staff,'checkOut',{id:b.id}).status,'CHECKED_OUT');});
test('request does not cancel immediately; duplicate requests and approvals fail',()=>{const h=harness(),p=request(h,{checkIn:new Date(Date.parse(h.data.now)+5*86400000).toISOString().slice(0,10),checkOut:new Date(Date.parse(h.data.now)+7*86400000).toISOString().slice(0,10)}),b=h.run(user,'createBooking',p);pay(h,b);const requested=h.run(user,'requestCancellation',{id:b.id,reason:'เปลี่ยนแผน'});assert.equal(requested.status,'CONFIRMED');assert.throws(()=>h.run(user,'requestCancellation',{id:b.id,reason:'ซ้ำ'}),{code:'CANCELLATION_DUPLICATE'});const r=requested.requests[0],c=h.run(staff,'reviewCancellation',{id:r.id,decision:'APPROVE',note:'ตามนโยบาย'});assert.equal(c.status,'CANCELLED');assert.equal(c.refunds[0].status,'PENDING');assert.equal(c.refunds[0].amount,b.total);assert.throws(()=>h.run(staff,'reviewCancellation',{id:r.id,decision:'APPROVE',note:'ซ้ำ'}),{code:'INVALID_STATE'});h.run(admin,'completeRefund',{id:c.refunds[0].id,reference:'DEMO-REFUND'});assert.throws(()=>h.run(admin,'completeRefund',{id:c.refunds[0].id,reference:'DUPLICATE'}),{code:'INVALID_STATE'});});
test('expiry releases pending inventory but holds submitted proof for review',()=>{const h=harness(),b=h.run(user,'createBooking',request(h));h.run(user,'requestCancellation',{id:b.id,reason:'test'});h.run(null,'setClock',{now:new Date(Date.parse(h.data.now)+25*3600000).toISOString()});assert.equal(h.run(user,'booking',{id:b.id}).status,'EXPIRED');assert.equal(h.run(user,'booking',{id:b.id}).requests[0].status,'REJECTED');assert.equal(h.run(other,'booking',{id:3}).status,'PENDING_PAYMENT');});
test('ineligible promotions and disabled services are refused',()=>{const h=harness();assert.throws(()=>h.run(user,'createBooking',request(h,{promotionId:2})),{code:'PROMOTION_INELIGIBLE'});h.run(admin,'saveMaster',{entity:'services',id:1,values:{name:'Breakfast',price:250,active:false}});assert.throws(()=>h.run(user,'createBooking',request(h,{services:[{serviceId:1,quantity:1}]})),{code:'INVALID_SERVICE'});});
test('admin cannot deactivate or demote own account; disabled staff loses authorization',()=>{const h=harness();assert.throws(()=>h.run(admin,'saveMaster',{entity:'employees',id:2,values:{...h.data.employees[1],role:'STAFF'}}),{code:'SELF_LOCKOUT'});h.run(admin,'saveMaster',{entity:'employees',id:1,values:{...h.data.employees[0],active:false}});assert.throws(()=>h.run(staff,'dashboard'),{code:'FORBIDDEN'});});
test('price change after quote requires a fresh review instead of silently charging more',()=>{const h=harness(),p=request(h);h.run(admin,'saveMaster',{entity:'roomTypes',id:1,values:{...h.data.roomTypes[0],price:1700}});assert.throws(()=>h.run(user,'createBooking',{...p,expectedTotal:6000}),{code:'PRICE_CHANGED'});assert.equal(h.data.bookings.length,3);});
test('new charges cannot change an amount while evidence is under review',()=>{const h=harness(),b=h.run(user,'createBooking',request(h));pay(h,b);h.run(staff,'checkIn',{id:b.id});const due=h.run(staff,'addService',{id:b.id,serviceId:3,quantity:1,status:'USED'});h.run(user,'submitPayment',{id:b.id,amount:due.balance,method:'PROMPTPAY',proof});assert.throws(()=>h.run(staff,'addService',{id:b.id,serviceId:1,quantity:1,status:'USED'}),{code:'PAYMENT_UNDER_REVIEW'});assert.equal(h.run(user,'booking',{id:b.id}).balance,180);});
test('revoked payment and cancellation permissions apply to existing staff sessions',()=>{
  const h=harness();h.run(admin,'saveMaster',{entity:'employees',id:1,values:{...h.data.employees[0],canReviewPayments:false,canReviewCancellations:false}});
  assert.throws(()=>h.run(staff,'reviewPayment',{id:3,decision:'APPROVE',verifiedAmount:6800}),{code:'FORBIDDEN'});
  const b=h.run(user,'requestCancellation',{id:1,reason:'Change plans'});
  assert.throws(()=>h.run(staff,'reviewCancellation',{id:b.requests[0].id,decision:'APPROVE',note:'ok'}),{code:'FORBIDDEN'});
  assert.equal(h.run(admin,'reviewCancellation',{id:b.requests[0].id,decision:'APPROVE',note:'ok'}).status,'CANCELLED');
  assert.equal(h.run(staff,'me').canReviewPayments,false);
});
function future(h,n){return new Date(Date.parse(h.data.now)+n*86400000).toISOString().slice(0,10);}
function maintenance(h,p={}){return {roomId:4,startDate:future(h,5),endDate:future(h,7),reason:'Repair air conditioning',...p};}
test('future maintenance blocks overlapping search and booking but allows adjacent dates',()=>{
  const h=harness();h.run(admin,'scheduleMaintenance',maintenance(h));
  const p=request(h,{roomIds:[4],guests:2,checkIn:future(h,5),checkOut:future(h,6)});
  assert(!h.run(null,'availability',p).find(t=>t.id===1).availableRooms.includes(4));
  assert.throws(()=>h.run(user,'createBooking',p),{code:'ROOM_UNAVAILABLE'});
  assert.equal(h.data.rooms.find(r=>r.id===4).status,'AVAILABLE');
  assert.equal(h.run(user,'createBooking',{...p,checkIn:future(h,7),checkOut:future(h,8)}).status,'PENDING_PAYMENT');
});
test('only admin can schedule maintenance; invalid and overlapping periods are atomic',()=>{
  const h=harness(),p=maintenance(h);
  for(const a of [user,staff])assert.throws(()=>h.run(a,'scheduleMaintenance',p),{code:'FORBIDDEN'});
  assert.throws(()=>h.run(admin,'scheduleMaintenance',{...p,endDate:p.startDate}),{code:'INVALID_DATES'});
  h.run(admin,'scheduleMaintenance',p);assert.throws(()=>h.run(admin,'scheduleMaintenance',p),{code:'MAINTENANCE_OVERLAP'});
  assert.equal(h.data.maintenance.length,1);assert.equal(h.run(staff,'listMaintenance')[0].status,'SCHEDULED');
});
test('maintenance cannot displace pending bookings or an overdue actual stay',()=>{
  const h=harness(),p=maintenance(h);h.run(user,'createBooking',request(h,{roomIds:[4],guests:2,checkIn:p.startDate,checkOut:p.endDate}));
  assert.throws(()=>h.run(admin,'scheduleMaintenance',p),{code:'ROOM_ALLOCATED'});
  assert.throws(()=>h.run(admin,'scheduleMaintenance',maintenance(h,{roomId:5,startDate:future(h,0),endDate:future(h,1)})),{code:'ROOM_ALLOCATED'});
  assert.equal(h.data.maintenance.length,0);
});
test('maintenance expiry restores date availability and preserves history',()=>{
  const h=harness();h.run(admin,'scheduleMaintenance',maintenance(h));h.run(null,'setClock',{now:future(h,8)+'T15:00:00+07:00'});
  assert.equal(h.run(admin,'listMaintenance')[0].status,'COMPLETED');
  assert(h.run(null,'availability',request(h,{roomIds:[4],guests:2})).find(t=>t.id===1).availableRooms.includes(4));
});
test('check-in validates maintenance again and rolls back the entire multi-room operation',()=>{
  const h=harness(),b=h.run(user,'createBooking',request(h));pay(h,b);
  h.data.maintenance.push({roomId:3,startDate:b.checkIn,endDate:b.checkOut});
  assert.throws(()=>h.run(staff,'checkIn',{id:b.id}),{code:'ROOM_NOT_READY'});
  assert.equal(h.data.rooms.find(r=>r.id===2).status,'AVAILABLE');assert.equal(h.data.stays.filter(s=>s.bookingId===b.id).length,0);
});
test('expired unpaid booking does not prevent room management',()=>{
  const h=harness();h.run(user,'createBooking',request(h));h.data.now=future(h,2)+'T15:00:00+07:00';
  const r=h.data.rooms.find(r=>r.id===2);assert.equal(h.run(admin,'saveMaster',{entity:'rooms',id:2,values:{...r,active:false}}).active,false);
});
test('master room floor and source schema text limits reject invalid values',()=>{
  const h=harness();assert.throws(()=>h.run(admin,'saveMaster',{entity:'rooms',id:4,values:{...h.data.rooms[3],floor:1.5}}),{code:'INVALID_INPUT'});
  assert.throws(()=>h.run(admin,'saveMaster',{entity:'roomTypes',id:1,values:{...h.data.roomTypes[0],description:'x'.repeat(501)}}),{code:'INVALID_INPUT'});
  assert.throws(()=>h.run(user,'profile',{...h.data.customers[0],firstName:'x'.repeat(101)}),{code:'INVALID_INPUT'});
});
test('staff can create a customer and book on their behalf with employee attribution',()=>{
  const h=harness(),c=h.run(staff,'saveMaster',{entity:'customers',values:{firstName:'Walk',lastName:'In',email:'walkin@example.test',phone:'0800000088',active:true}});
  const b=h.run(staff,'createBooking',request(h,{customerId:c.id}));assert.equal(b.customerId,c.id);assert.equal(b.employeeId,staff.id);
  assert.throws(()=>h.run(user,'booking',{id:b.id}),{code:'NOT_FOUND'});
});
