'use strict';
const assert=require('node:assert/strict');
const {toPaise,validate,summarize,goalPlan,validDate}=require('../student-planner.js');
let checks=0;function check(name,fn){fn();checks++;console.log('PASS:',name);}
const fixture={version:1,incomes:[{id:'i1',name:'Allowance',amount:1000000,date:'2026-11-01',source:'Allowance'},{id:'i2',name:'Past income',amount:900000,date:'2026-10-01',source:'Other'}],bills:[{id:'b1',name:'Rent',amount:400000,date:'2026-11-30',paid:false},{id:'b2',name:'Paid phone bill',amount:10000,date:'2026-11-02',paid:true},{id:'b3',name:'Next term fee',amount:500000,date:'2026-12-01',paid:false}],goal:{name:'Laptop',target:6000000,saved:1200000,deadline:'2027-01-26'}};
const ledger={selectedMonth:'2026-11',transactions:[{amount:120.50,date:'2026-11-10'},{amount:100,date:'2026-11-02'},{amount:900,date:'2026-10-01'}]};
check('currency uses exact paise',()=>{assert.equal(toPaise('120.50'),12050);assert.equal(toPaise('0.01'),1);assert.equal(toPaise('0.10'),10);});
check('fractional paise and invalid currency rejected',()=>{for(const n of ['1.001','-1','NaN','1e3','1000000001'])assert.throws(()=>toPaise(n));});
check('calendar validation covers leap years',()=>{assert(validDate('2024-02-29'));assert(!validDate('2026-02-29'));assert(!validDate('2026-04-31'));});
check('selected month isolates received income and expenses',()=>{const s=summarize(fixture,ledger,'2026-11-27');assert.equal(s.income,1000000);assert.equal(s.spent,22050);assert.equal(s.remaining,977950);});
check('only unpaid bills in selected month reserved',()=>{const s=summarize(fixture,ledger,'2026-11-27');assert.equal(s.reserved,400000);assert.equal(s.afterBills,577950);assert.equal(s.bills.length,2);});
check('paid flag does not create an expense record',()=>{const copy=structuredClone(fixture);copy.bills[0].paid=true;const s=summarize(copy,ledger,'2026-11-27');assert.equal(s.reserved,0);assert.equal(s.spent,22050);assert.equal(ledger.transactions.length,3);});
check('savings contribution plan rounds up in paise',()=>{const g=goalPlan(fixture.goal,'2026-11-27');assert.equal(g.days,60);assert.equal(g.periods,2);assert.equal(g.monthly,2400000);assert.equal(g.progress,20);});
check('completed and overdue goals are distinct',()=>{assert.equal(goalPlan({...fixture.goal,saved:6000000},'2027-02-01').remaining,0);assert.equal(goalPlan(fixture.goal,'2027-02-01').overdue,true);});
check('valid backup is normalized and detached',()=>{const v=validate(fixture);assert.deepEqual(v,fixture);v.incomes[0].name='Changed';assert.equal(fixture.incomes[0].name,'Allowance');});
check('invalid backup and duplicate identifiers rejected',()=>{assert.throws(()=>validate({}));const f=structuredClone(fixture);f.bills[0].id='i1';assert.throws(()=>validate(f));const g=structuredClone(fixture);g.goal.target=0;assert.throws(()=>validate(g));});
check('negative cash remaining stays visible',()=>{const f=structuredClone(fixture);f.incomes=[];assert.equal(summarize(f,ledger,'2026-11-27').afterBills,-422050);});
console.log(`${checks} student planner checks passed.`);
