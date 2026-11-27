(function (scope) {
  'use strict';
  function analyze(snapshot, now = new Date()) {
    const [year,month]=snapshot.selectedMonth.split('-').map(Number);
    const current=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const days=new Date(year,month,0).getDate();
    const elapsed=snapshot.selectedMonth===current?now.getDate():snapshot.selectedMonth<current?days:0;
    const previous=new Date(year,month-2,1);
    const previousMonth=`${previous.getFullYear()}-${String(previous.getMonth()+1).padStart(2,'0')}`;
    const previousDays=new Date(year,month-1,0).getDate();
    const comparableDays=Math.min(elapsed,previousDays);
    const items=snapshot.transactions.filter(t=>t.date.startsWith(snapshot.selectedMonth));
    const total=items.reduce((s,t)=>s+Math.round(t.amount*100),0);
    const prior=snapshot.transactions.filter(t=>t.date.startsWith(previousMonth)&&Number(t.date.slice(8))<=comparableDays).reduce((s,t)=>s+Math.round(t.amount*100),0);
    const comparableTotal=items.filter(t=>Number(t.date.slice(8))<=comparableDays).reduce((s,t)=>s+Math.round(t.amount*100),0);
    const recordedToDate=items.filter(t=>Number(t.date.slice(8))<=elapsed).reduce((s,t)=>s+Math.round(t.amount*100),0);
    const estimate=elapsed?Math.round(recordedToDate/elapsed*days):null;
    const categories={};items.forEach(t=>categories[t.category]=(categories[t.category]||0)+Math.round(t.amount*100));
    const flexible=items.filter(t=>['Shopping','Entertainment'].includes(t.category)).reduce((s,t)=>s+Math.round(t.amount*100),0);
    return {total,prior,comparableTotal,comparableDays,previousMonth,estimate,elapsed,days,items,categories,flexible,current:snapshot.selectedMonth===current};
  }
  if(typeof module==='object'&&module.exports){module.exports={analyze};return;}
  const root=document.querySelector('#finance-insights');
  const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(v/100);
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  root.innerHTML=`<div class="panel-heading"><div><p class="eyebrow">UNDERSTAND YOUR HABITS</p><h2>Spending outlook</h2></div><button class="button button-quiet" id="monthly-summary">Download monthly summary</button></div><div class="outlook-grid"><div><h3>Month comparison</h3><p id="outlook-comparison"></p></div><div><h3>At your current pace</h3><p id="outlook-projection"></p></div><div><h3>What if I spend less?</h3><label for="outlook-cut">Reduce shopping & entertainment by <strong id="outlook-cut-value">10%</strong></label><input id="outlook-cut" type="range" min="0" max="100" value="10" step="5"><p id="outlook-savings"></p></div></div><p class="muted">Estimates use recorded expenses only. Missing entries, one-off purchases and upcoming bills can change the result. Savings scenarios do not modify your records.</p>`;
  let analysis;
  function render(){
    analysis=analyze(scope.ledgerSnapshot());
    const a=analysis;
    document.querySelector('#outlook-comparison').textContent=a.prior?`${money(Math.abs(a.comparableTotal-a.prior))} ${a.comparableTotal>=a.prior?'more':'less'} than ${a.previousMonth}, comparing the first ${a.comparableDays} days of each month.`:`No spending recorded for the comparable period in ${a.previousMonth}. Keep recording expenses to build a comparison.`;
    document.querySelector('#outlook-projection').textContent=!a.items.length?'Add expenses to calculate your spending pace.':a.current?`${money(a.estimate)} projected this month if your average daily spending through today continues. Future-dated entries are excluded from this estimate.`:`${money(a.total)} recorded for this month. Forecasts are available for the current month.`;
    scenario();
  }
  function scenario(){const cut=Number(document.querySelector('#outlook-cut').value);document.querySelector('#outlook-cut-value').textContent=cut+'%';document.querySelector('#outlook-savings').textContent=analysis.flexible?`That would free up ${money(Math.round(analysis.flexible*cut/100))} on ${money(analysis.flexible)} of recorded optional-category spending.`:'Record shopping or entertainment expenses to explore potential savings.';}
  scope.financeAdvice=()=>document.querySelector('#outlook-projection').textContent+' '+document.querySelector('#outlook-comparison').textContent;
  document.querySelector('#outlook-cut').addEventListener('input',scenario);
  document.addEventListener('ledger-updated',render);
  document.querySelector('#monthly-summary').addEventListener('click',()=>{
    const data=scope.ledgerSnapshot(), a=analyze(data);
    const b=Object.hasOwn(data.budgets,data.selectedMonth)?money(Math.round(data.budgets[data.selectedMonth]*100)):'Not set';
    const categories=Object.entries(a.categories).sort((x,y)=>y[1]-x[1]).map(([c,n])=>`<tr><td>${esc(c)}</td><td>${money(n)}</td></tr>`).join('');
    const rows=a.items.map(t=>`<tr><td>${t.date}</td><td>${esc(t.description)}</td><td>${esc(t.category)}</td><td>${esc(t.payment)}</td><td>${money(Math.round(t.amount*100))}</td></tr>`).join('');
    const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Campus Ledger ${data.selectedMonth}</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:24px;color:#183c2b}h1{font-size:32px}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{text-align:left;padding:12px;border-bottom:1px solid #ddd}p{line-height:1.6}@media print{body{margin:0;font-size:11pt}thead{display:table-header-group}tr{break-inside:avoid}}</style><h1>Monthly expense summary</h1><p>Campus Ledger · ${data.selectedMonth}<br>Generated ${new Date().toLocaleDateString('en-IN')}</p><p>Total spent: <strong>${money(a.total)}</strong><br>Budget: ${b}<br>Transactions: ${a.items.length}</p><h2>By category</h2><table><thead><tr><th>Category</th><th>Spending</th></tr></thead><tbody>${categories||'<tr><td colspan="2">No expenses</td></tr>'}</tbody></table><h2>Transactions</h2><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Payment</th><th>Amount</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No expenses</td></tr>'}</tbody></table><p>This report contains recorded expenses only. It excludes planner balances, shared-bill settlements and credit card activity tracked separately. Open this file in a browser and use Print to save a PDF.</p></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`campus-summary-${data.selectedMonth}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  render();
})(typeof window==='undefined'?globalThis:window);
