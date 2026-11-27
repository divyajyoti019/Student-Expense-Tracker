const assert=require('node:assert/strict');
const {analyze}=require('../finance-insights.js');
let a=analyze({selectedMonth:'2026-03',transactions:[{date:'2026-03-01',amount:120.50,category:'Shopping'},{date:'2026-03-05',amount:10.10,category:'Food'},{date:'2026-02-01',amount:100,category:'Food'},{date:'2026-02-10',amount:900,category:'Food'}]},new Date(2026,2,5));
assert.equal(a.total,13060);assert.equal(a.prior,10000);assert.equal(a.flexible,12050);assert.equal(a.estimate,80972);assert.equal(a.comparableDays,5);
a=analyze({selectedMonth:'2026-03',transactions:[{date:'2026-03-31',amount:10,category:'Food'},{date:'2026-02-28',amount:12,category:'Food'}]},new Date(2026,3,2));assert.equal(a.total,1000);assert.equal(a.comparableTotal,0);assert.equal(a.prior,1200);assert.equal(a.comparableDays,28);
a=analyze({selectedMonth:'2027-01',transactions:[]},new Date(2026,11,20));assert.equal(a.estimate,null);assert.equal(a.previousMonth,'2026-12');
a=analyze({selectedMonth:'2026-11',transactions:[{date:'2026-11-05',amount:100,category:'Food'},{date:'2026-11-29',amount:3000,category:'Hostel'}]},new Date(2026,10,10));assert.equal(a.total,310000);assert.equal(a.estimate,30000);
console.log('PASS: exact paise totals, same-day comparison, month-length boundary, future forecast suppression, year rollover, future expenses excluded from pace');
