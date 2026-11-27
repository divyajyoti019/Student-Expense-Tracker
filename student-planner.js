(function () {
  'use strict';
  const KEY = 'campus-student-plan-v1';
  const MAX_AMOUNT = 100000000000;
  const empty = () => ({version: 1, incomes: [], bills: [], goal: null});
  const today = () => {const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && value <= '9999-12-31' && !Number.isNaN(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
  }
  function toPaise(value) {
    if(!/^\d+(\.\d{1,2})?$/.test(String(value))) throw Error('Enter a valid amount with no more than two decimal places.');
    const parts=String(value).split('.'); const amount=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
    if(!Number.isSafeInteger(amount)||amount<0||amount>MAX_AMOUNT)throw Error('Enter an amount between ₹0 and ₹1,000,000,000.');return amount;
  }
  function validate(value) {
    if(!value||value.version!==1||!Array.isArray(value.incomes)||!Array.isArray(value.bills)||value.incomes.length>10000||value.bills.length>10000)throw Error('This is not a valid student planner backup.');
    const ids=new Set();
    const text=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
    const amount=(n,positive=false)=>Number.isSafeInteger(n)&&n>=(positive?1:0)&&n<=MAX_AMOUNT;
    function record(r,isBill){
      if(!r||!text(r.id,100)||ids.has(r.id)||!text(r.name,70)||!amount(r.amount,true)||!validDate(r.date)||(!isBill&&!['Allowance','Scholarship','Internship','Part-time work','Other'].includes(r.source))||(isBill&&typeof r.paid!=='boolean'))throw Error('A planner record contains invalid details.');
      ids.add(r.id);return isBill?{id:r.id,name:r.name,amount:r.amount,date:r.date,paid:r.paid}:{id:r.id,name:r.name,amount:r.amount,date:r.date,source:r.source};
    }
    const result={version:1,incomes:value.incomes.map(r=>record(r,false)),bills:value.bills.map(r=>record(r,true)),goal:null};
    if(value.goal!==null&&value.goal!==undefined){const g=value.goal;if(!text(g.name,70)||!amount(g.target,true)||!amount(g.saved)||!validDate(g.deadline))throw Error('The savings goal is invalid.');result.goal={name:g.name,target:g.target,saved:g.saved,deadline:g.deadline};}
    return result;
  }
  function goalPlan(goal,asOf=today()) {
    if(!goal)return null;
    const remaining=Math.max(0,goal.target-goal.saved);
    const days=Math.max(0,Math.round((Date.parse(goal.deadline+'T12:00:00Z')-Date.parse(asOf+'T12:00:00Z'))/86400000));
    const periods=Math.max(1,Math.ceil(days/30));
    return {remaining,days,periods,monthly:Math.ceil(remaining/periods),progress:Math.min(100,goal.saved/goal.target*100),overdue:remaining>0&&goal.deadline<asOf};
  }
  function summarize(data,ledger,asOf=today()) {
    const month=/^\d{4}-(0[1-9]|1[0-2])$/.test(ledger?.selectedMonth||'')?ledger.selectedMonth:asOf.slice(0,7);
    const income=data.incomes.filter(r=>r.date.startsWith(month)).reduce((s,r)=>s+r.amount,0);
    const spent=(ledger?.transactions||[]).filter(r=>typeof r.date==='string'&&r.date.startsWith(month)&&Number.isFinite(Number(r.amount))&&Number(r.amount)>0).reduce((s,r)=>s+Math.round(Number(r.amount)*100),0);
    const bills=data.bills.filter(r=>r.date.startsWith(month));
    const reserved=bills.filter(r=>!r.paid).reduce((s,r)=>s+r.amount,0);
    return {month,income,spent,reserved,remaining:income-spent,afterBills:income-spent-reserved,bills,goal:goalPlan(data.goal,asOf)};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={toPaise,validate,summarize,goalPlan,validDate};
  if(typeof document==='undefined')return;
  const root=document.querySelector('#student-planner');if(!root)return;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=c=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(c/100);
  const ledger=()=>typeof window.ledgerSnapshot==='function'?window.ledgerSnapshot():{selectedMonth:today().slice(0,7),transactions:[]};
  let data=empty(),blocked=false,message='';
  try {const raw=localStorage.getItem(KEY);if(raw!==null)data=validate(JSON.parse(raw));}catch{blocked=true;message='Saved planner data could not be read. Restore a valid planner backup to continue; existing storage has not been overwritten.';}
  const dialog=document.createElement('dialog');dialog.className='modal sp-dialog';dialog.setAttribute('aria-label','Student planner form');document.body.append(dialog);
  function save(next){const checked=validate(next);localStorage.setItem(KEY,JSON.stringify(checked));data=checked;blocked=false;render();document.dispatchEvent(new CustomEvent('student-plan-updated'));}
  function communicate(text){message=text;const node=root.querySelector('#sp-status');if(node)node.textContent=text;}
  const formField=(label,name,type,value='',attrs='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs} required></label>`;
  const amountField=(label,name,value='')=>formField(label+' (₹)',name,'number',value,'min="0" max="1000000000" step="0.01"');
  function render(){
    const sum=summarize(data,ledger());const goal=sum.goal;
    const incomeRows=data.incomes.filter(r=>r.date.startsWith(sum.month)).sort((a,b)=>b.date.localeCompare(a.date));
    const bills=sum.bills.slice().sort((a,b)=>Number(a.paid)-Number(b.paid)||a.date.localeCompare(b.date));
    root.innerHTML=`<div class="panel-heading"><div><p class="eyebrow">PLAN YOUR SEMESTER</p><h2>Student money planner</h2><p class="muted">Allowance, bills and the things you are saving for. Selected month: <strong>${esc(sum.month)}</strong>.</p></div><button class="button button-primary" data-sp-open="income">Add income</button></div>
      <p id="sp-status" class="sp-status" role="status">${esc(message)}</p>
      <div class="sp-summary"><div><span>Income received</span><strong>${money(sum.income)}</strong><small>Allowance, scholarship and work</small></div><div><span>After recorded expenses</span><strong class="${sum.remaining<0?'sp-negative':''}">${money(sum.remaining)}</strong><small>Income minus expense ledger</small></div><div><span>Unpaid bills reserved</span><strong>${money(sum.reserved)}</strong><small>Due in the selected month</small></div><div><span>After bill reserve</span><strong class="${sum.afterBills<0?'sp-negative':''}">${money(sum.afterBills)}</strong><small>${sum.afterBills<0?'More funding or a smaller plan is needed':'Planning estimate, not a bank balance'}</small></div></div>
      <div class="sp-columns"><article class="sp-area"><div class="panel-heading"><h3>Income this month</h3></div>${incomeRows.length?`<ul class="sp-records">${incomeRows.map(r=>`<li><div><strong>${esc(r.name)}</strong><span>${esc(r.source)} · ${r.date}</span></div><strong>${money(r.amount)}</strong><button class="sp-text-button" data-sp-edit="income" data-id="${esc(r.id)}" aria-label="Edit income ${esc(r.name)}">Edit</button><button class="sp-text-button" data-sp-delete="income" data-id="${esc(r.id)}" aria-label="Delete income ${esc(r.name)}">Delete</button></li>`).join('')}</ul>`:'<p class="sp-empty">Record money you have received to start planning. Future income is not counted.</p>'}</article>
      <article class="sp-area"><div class="panel-heading"><h3>Upcoming bills</h3><button class="button button-quiet" data-sp-open="bill">Add bill</button></div><p class="sp-help">Paid is a reminder status only. Record each paid bill once in the expense ledger so your remaining estimate stays accurate.</p>${bills.length?`<ul class="sp-records">${bills.map(r=>`<li><div><strong>${esc(r.name)}</strong><span class="${!r.paid&&r.date<today()?'sp-negative':''}">${r.date} · ${r.paid?'Paid':r.date<today()?'Overdue':'Unpaid'}</span></div><strong>${money(r.amount)}</strong><button class="sp-text-button" data-sp-paid="${esc(r.id)}">${r.paid?'Undo paid':'Mark paid'}</button><button class="sp-text-button" data-sp-edit="bill" data-id="${esc(r.id)}" aria-label="Edit bill ${esc(r.name)}">Edit</button><button class="sp-text-button" data-sp-delete="bill" data-id="${esc(r.id)}" aria-label="Delete bill ${esc(r.name)}">Delete</button></li>`).join('')}</ul>`:'<p class="sp-empty">Plan hostel rent, exam fees, subscriptions or travel costs. Choose a month above to see its bills.</p>'}</article></div>
      <div class="sp-columns"><article class="sp-area sp-goal"><div class="panel-heading"><div><p class="eyebrow">SOMETHING TO WORK TOWARD</p><h3>${data.goal?esc(data.goal.name):'Your savings goal'}</h3></div><button class="button button-quiet" data-sp-open="goal">${goal?'Edit goal':'Set goal'}</button></div>${goal?`<p><strong>${money(data.goal.saved)}</strong> saved of ${money(data.goal.target)}</p><progress max="100" value="${goal.progress}" aria-label="Savings goal progress">${Math.round(goal.progress)}%</progress><p class="sp-help">${goal.remaining===0?'Goal reached. Your recorded savings cover the target.':goal.overdue?`The deadline ${data.goal.deadline} has passed. ${money(goal.remaining)} remains; revise your date or target.`:`Set aside ${money(goal.monthly)} per 30-day period across ${goal.periods} remaining periods to reach your target by ${data.goal.deadline}.`}</p><p class="sp-help">Savings are recorded manually. This goal does not transfer money or deduct it from the cash estimate.</p>`:'<p class="sp-empty">Save for a laptop, a certification, an emergency fund or your next semester. Get a contribution plan based on your target date.</p>'}</article>
      <article class="sp-area"><h3>What if I cut a daily expense?</h3><p class="sp-help">Try a smaller snack or commute cost. This calculator does not change your records.</p><form id="sp-whatif" class="sp-whatif">${amountField('Daily amount to save','daily','30')}${formField('Number of days','days','number','30','min="1" max="366" step="1"')}<button class="button button-quiet">Calculate</button></form><p id="sp-scenario" class="sp-scenario" role="status">₹30 per day for 30 days leaves ₹900 for another priority.</p></article></div>
      <details class="sp-backup"><summary>Planner backup and restore</summary><p class="sp-help">This backup contains only incomes, bills and your savings goal. Expenses and cards have their own backups.</p><button class="button button-quiet" id="sp-export">Download planner backup</button> <label class="button button-quiet">Restore planner<input type="file" id="sp-import" accept="application/json,.json" hidden></label></details>`;
    root.querySelector('#sp-whatif').onsubmit=e=>{e.preventDefault();const values=new FormData(e.target);try{const daily=toPaise(values.get('daily')),days=Number(values.get('days'));if(!Number.isInteger(days)||days<1||days>366)throw Error('Choose between 1 and 366 days.');root.querySelector('#sp-scenario').textContent=`${money(daily)} per day × ${days} days = ${money(daily*days)} available for another priority.`;}catch(error){root.querySelector('#sp-scenario').textContent=error.message;}};
    root.querySelector('#sp-export').onclick=()=>{if(blocked){communicate('The stored data is unreadable. It has not been overwritten.');return;}const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='campus-student-planner.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    root.querySelector('#sp-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('Choose a backup smaller than 5 MB.');const next=validate(JSON.parse(await file.text()));if(confirm('Replace your planner income, bills and savings goal with this backup?')){save(next);communicate('Planner backup restored.');}}catch(error){communicate('Restore failed: '+error.message);}finally{e.target.value='';}};
  }
  function open(type,id){
    if(blocked){communicate('Restore a valid planner backup before changing unreadable stored data.');return;}
    const current=type==='goal'?data.goal:(type==='income'?data.incomes:data.bills).find(r=>r.id===id);
    const month=summarize(data,ledger()).month;
    let fields='',title='';
    if(type==='goal'){title='Plan a savings goal';fields=formField('Goal name','name','text',current?.name||'','maxlength="70"')+amountField('Target amount','target',current?current.target/100:'')+amountField('Already saved','saved',current?current.saved/100:'0')+formField('Target date','deadline','date',current?.deadline||'',`min="${today()}"`);}
    else {title=(current?'Edit ':'Add ')+(type==='income'?'received income':'an upcoming bill');fields=formField(type==='income'?'Income description':'Bill name','name','text',current?.name||'','maxlength="70"')+amountField('Amount','amount',current?current.amount/100:'')+formField(type==='income'?'Date received':'Due date','date','date',current?.date||(month===today().slice(0,7)?today():month+'-01'),type==='income'?`max="${today()}"`:'');if(type==='income')fields+=`<label class="field">Income source<select name="source">${['Allowance','Scholarship','Internship','Part-time work','Other'].map(s=>`<option${current?.source===s?' selected':''}>${s}</option>`).join('')}</select></label>`;}
    dialog.innerHTML=`<form><div class="modal-header"><h2>${title}</h2><button type="button" class="close-button" aria-label="Close planner form">×</button></div><div class="form-grid">${fields}</div><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button class="button button-primary">Save ${type==='goal'?'goal':'record'}</button></div></form>`;
    dialog.querySelector('.close-button').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));const next=structuredClone(data);if(!values.name.trim())throw Error('Enter a meaningful name.');
      if(type==='goal'){const target=toPaise(values.target),saved=toPaise(values.saved);if(target===0)throw Error('Your target must be greater than zero.');if(!validDate(values.deadline)||values.deadline<today())throw Error('Choose today or a future target date.');next.goal={name:values.name.trim(),target,saved,deadline:values.deadline};}
      else {const amount=toPaise(values.amount);if(amount===0)throw Error('Amount must be greater than zero.');if(!validDate(values.date)||type==='income'&&values.date>today())throw Error('Received income cannot have a future date.');const record={id:current?.id||crypto.randomUUID(),name:values.name.trim(),amount,date:values.date,...(type==='income'?{source:values.source}:{paid:current?.paid||false})};const key=type==='income'?'incomes':'bills';next[key]=current?next[key].map(r=>r.id===current.id?record:r):[...next[key],record];}
      save(next);dialog.close();communicate('Planner saved.');
    }catch(error){const out=dialog.querySelector('.form-error');out.hidden=false;out.textContent='Could not save: '+error.message;}};
    dialog.showModal();
  }
  root.addEventListener('click',e=>{
    const add=e.target.closest('[data-sp-open]');if(add)open(add.dataset.spOpen);
    const edit=e.target.closest('[data-sp-edit]');if(edit)open(edit.dataset.spEdit,edit.dataset.id);
    const remove=e.target.closest('[data-sp-delete]');if(remove&&!blocked&&confirm('Delete this planner record?')){try{const next=structuredClone(data),key=remove.dataset.spDelete==='income'?'incomes':'bills';next[key]=next[key].filter(r=>r.id!==remove.dataset.id);save(next);communicate('Record removed.');}catch(error){communicate('Could not save: '+error.message);}}
    const paid=e.target.closest('[data-sp-paid]');if(paid&&!blocked){try{const next=structuredClone(data),bill=next.bills.find(r=>r.id===paid.dataset.spPaid);if(bill){bill.paid=!bill.paid;save(next);communicate(bill.paid?'Bill marked paid. Add it once to the expense ledger if it is not already there.':'Bill returned to unpaid reminders. No expense record was changed.');}}catch(error){communicate('Could not save: '+error.message);}}
  });
  window.studentPlannerAdvice=()=>{if(blocked)return 'Planner storage could not be read. Restore a valid planner backup.';const sum=summarize(data,ledger());return `For ${sum.month}, received income is ${money(sum.income)}, recorded expenses are ${money(sum.spent)}, and unpaid bill reserves are ${money(sum.reserved)}. The planning balance after these reserves is ${money(sum.afterBills)}. `+(sum.goal?sum.goal.remaining===0?'Your recorded savings goal is reached.':`Your savings goal still needs ${money(sum.goal.remaining)}${sum.goal.overdue?' and its deadline has passed.':`; plan ${money(sum.goal.monthly)} per 30-day period.`}`:'Set a savings goal to get a contribution plan.')+' This estimate excludes unrecorded costs and bank balances.';};
  window.studentPlanner={exportData:()=>structuredClone(data),validate,restore:next=>save(validate(next))};
  document.addEventListener('ledger-updated',()=>render());render();
})();
