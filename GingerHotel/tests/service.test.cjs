const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const seed=require('../public/js/seed.js'),domain=require('../public/js/domain.js');
const key='ginger-hotel-demo-v1';
function setup(initial){
  const data=new Map(initial?[[key,JSON.stringify(initial)]]:[]),sessions=new Map();
  const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
  const context={window:{},localStorage:storage(data),sessionStorage:storage(sessions),navigator:{},GingerSeed:seed,GingerDomain:domain,URLSearchParams,fetch:async()=>{throw new Error('unexpected network');}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/service.js'),'utf8'),context);
  return {context,service:context.window.HotelService,data};
}
test('service upgrades old mock permissions without losing booking or proof data',async()=>{
  const original=seed();original.version=1;original.employees.forEach(e=>{delete e.canReviewPayments;delete e.canReviewCancellations;delete e.jobTitle;});
  const {service,data}=setup(original);await service.call('login',{role:'STAFF',id:1});
  assert.equal(service.getSession().canReviewPayments,true);
  const stored=JSON.parse(data.get(key));assert.equal(stored.version,2);assert.deepEqual(stored.bookings,original.bookings);assert.deepEqual(stored.payments,original.payments);
});
test('service persistence failure leaves the previous transaction intact',async()=>{
  const {service,data,context}=setup(seed());await service.call('login',{role:'USER',id:1});const before=data.get(key);
  context.localStorage.setItem=()=>{throw new Error('quota');};
  await assert.rejects(service.call('profile',{firstName:'Changed',lastName:'Name',email:'new@example.test',phone:'0800000001'}));
  assert.equal(data.get(key),before);
});
test('HTTP adapter routes maintenance through JSON and sends session/CSRF context',async()=>{
  const {service,context}=setup();service.config.mode='api';context.window.GINGER_CSRF_TOKEN='csrf-demo-test';let sent;
  context.fetch=async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({data:{id:42}})};};
  const payload={roomId:4,startDate:'2026-12-01',endDate:'2026-12-03',reason:'Repair'};
  assert.equal((await service.call('scheduleMaintenance',payload)).id,42);
  assert.equal(sent.url,'/api/v1/maintenance');assert.equal(sent.options.method,'POST');assert.equal(sent.options.credentials,'include');
  assert.equal(sent.options.headers['X-CSRF-Token'],'csrf-demo-test');assert.deepEqual(JSON.parse(sent.options.body),payload);
});
test('HTTP adapter surfaces backend errors and does not turn a failed request into success',async()=>{
  const {service,context}=setup();service.config.mode='api';context.fetch=async()=>({ok:false,json:async()=>({error:{code:'ROOM_ALLOCATED',message:'Overlapping booking'}})});
  await assert.rejects(service.call('scheduleMaintenance',{roomId:4}),{code:'ROOM_ALLOCATED',message:'Overlapping booking'});
});
