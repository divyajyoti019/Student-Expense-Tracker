(() => {
  'use strict';
  const KEY = 'campus-ledger-cards-v1';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = cents => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(cents/100);
  const today = () => { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const dateOK = d => typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d+'T12:00:00Z')) && new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  const cents = n => { if (!/^\d+(\.\d{1,2})?$/.test(String(n))) throw Error('Enter an amount with at most two decimal places.'); const v=Math.round(Number(n)*100);if(!Number.isSafeInteger(v)||v<0||v>1e11)throw Error('Amount is outside the supported range.');return v; };
  const balance = c => c.opening + c.entries.reduce((sum,e)=>sum+(e.type==='payment'?-e.amount:e.amount),0);
  const due = c => Math.max(0,c.statement-c.entries.filter(e=>e.type==='payment' && e.seq>c.statementSeq).reduce((s,e)=>s+e.amount,0));
  const minimum = c => Math.min(due(c),Math.max(0,c.minimum-c.entries.filter(e=>e.type==='payment'&&e.seq>c.statementSeq).reduce((s,e)=>s+e.amount,0)));
  let cards=[], blocked=false;
  function valid(data){
    if(!Array.isArray(data)||data.length>100)throw Error('Invalid card list.');
    const ids=new Set();
    for(const c of data){
      if(!c || typeof c.id!=='string'||!c.id||c.id.length>80||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>60||typeof c.last4!=='string'||!/^\d{4}$/.test(c.last4)||!dateOK(c.dueDate)||!dateOK(c.statementDate)||c.statementDate>today()||c.statementDate>c.dueDate||!Array.isArray(c.entries)||c.entries.length>10000)throw Error('Invalid card details.');ids.add(c.id);
      for(const f of ['opening','limit','statement','minimum','statementSeq'])if(!Number.isSafeInteger(c[f])||c[f]<0||c[f]>1e11)throw Error('Invalid card amount.');
      if(c.limit===0||c.minimum>c.statement)throw Error('Invalid limit or minimum.');
      let seq=0,b=c.opening,checkpointBalance=c.statementSeq===0?b:null;
      for(const e of c.entries){
        if(!e||!Number.isSafeInteger(e.seq)||e.seq!==seq+1||!['charge','payment'].includes(e.type)||!Number.isSafeInteger(e.amount)||e.amount<=0||e.amount>1e11||!dateOK(e.date)||e.date>today()||typeof e.note!=='string'||e.note.length>100)throw Error('Invalid card activity.');
        if(e.seq>c.statementSeq && e.date<c.statementDate)throw Error('Activity after the statement snapshot cannot predate its statement.');
        seq=e.seq;b+=e.type==='payment'?-e.amount:e.amount;
        if(!Number.isSafeInteger(b)||b<0||b>1e11)throw Error('Recorded balance is outside the supported range.');
        if(seq===c.statementSeq)checkpointBalance=b;
      }
      if(checkpointBalance===null||c.statement>checkpointBalance)throw Error('Invalid statement snapshot or unpaid amount.');
    }
    return data;
  }
  function undoLast(card){
    const last=card.entries.at(-1);
    if(!last || last.seq<=card.statementSeq)throw Error('This activity is included in the current statement snapshot and cannot be undone.');
    const next=structuredClone(card);next.entries.pop();valid([next]);return next;
  }
  if(typeof module!=='undefined' && module.exports){module.exports={cents,dateOK,balance,due,minimum,valid,undoLast};return;}
  const root = document.querySelector('#credit-cards');
  if(!root)return;
  try {cards=valid(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch{blocked=true;}
  root.innerHTML=`<div class="panel-heading"><div><h2>Credit cards</h2><p class="muted">Manual tracking only. Record payments made through your bank. Card activity is separate from the expense dashboard.</p></div><button class="button button-primary" id="cc-add">+ Add card</button></div><p class="muted">Use a nickname and last four digits only. Do not enter card numbers, CVVs, PINs or passwords. Saved locally in this browser.</p><p id="cc-status" role="status"></p><div id="cc-list" class="cc-grid"></div><div class="assistant-prompts"><button class="button button-quiet" id="cc-backup">Backup cards</button><label class="button button-quiet">Restore cards<input type="file" id="cc-restore" accept=".json,application/json" hidden></label></div><details class="cc-history"><summary>Payment and purchase history</summary><div class="table-scroll"><table><thead><tr><th>Card</th><th>Date</th><th>Type</th><th>Amount</th><th>Note / reference</th></tr></thead><tbody id="cc-history"></tbody></table></div></details>`;
  const dialog=document.createElement('dialog');dialog.className='modal';dialog.id='cc-dialog';dialog.setAttribute('aria-label','Credit card details');document.body.append(dialog);
  const status=(s)=>{document.querySelector('#cc-status').textContent=s;};
  function save(next){try{valid(next);localStorage.setItem(KEY,JSON.stringify(next));cards=next;blocked=false;render();return true;}catch(e){throw Error('Could not save card data: '+e.message);}}
  function render(){
    document.querySelector('#cc-list').innerHTML=cards.length?cards.map(c=>{
      const b=balance(c),d=due(c),overdue=d>0&&c.dueDate<today();
      return `<article class="cc-card"><div class="card-top"><strong>${esc(c.name)}</strong><span>•••• ${c.last4}</span></div><p class="metric">${money(b)}</p><p class="muted">Outstanding balance</p><dl><dt>Credit limit</dt><dd>${money(c.limit)}</dd><dt>${b>c.limit?'Over limit':'Available credit'}</dt><dd>${money(Math.abs(c.limit-b))}</dd><dt>Utilization</dt><dd>${(b/c.limit*100).toFixed(1)}%</dd><dt>Statement date</dt><dd>${esc(c.statementDate)}</dd><dt>Statement still due</dt><dd>${money(d)}</dd><dt>Minimum still due</dt><dd>${money(minimum(c))}</dd><dt>Payment due</dt><dd class="${overdue?'cc-overdue':''}">${esc(c.dueDate)}${overdue?' · Overdue':d===0?' · Paid':''}</dd></dl><div class="assistant-prompts"><button class="button button-primary" data-cc-action="payment" data-id="${esc(c.id)}">Record payment</button><button class="button button-quiet" data-cc-action="charge" data-id="${esc(c.id)}">Add purchase / fee</button><button class="button button-quiet" data-cc-action="statement" data-id="${esc(c.id)}">New statement</button><button class="button button-quiet" data-cc-action="edit" data-id="${esc(c.id)}">Edit card</button>${c.entries.at(-1)?.seq>c.statementSeq?`<button class="button button-quiet" data-cc-action="undo" data-id="${esc(c.id)}">Undo last activity</button>`:''}</div><p class="cc-tip">${overdue?'A statement payment is overdue. Check your issuer’s statement and payment confirmation.':d>0?'Set aside '+money(d)+' for this statement. Paying only the minimum may leave an unpaid statement balance.':'Statement covered by recorded payments. Check new purchases before the next statement.'}</p></article>`;
    }).join(''):'<p class="muted">Add your first card using your latest statement and current outstanding balance.</p>';
    const entries=cards.flatMap(c=>c.entries.map(e=>({...e,name:c.name,last4:c.last4}))).sort((a,b)=>b.date.localeCompare(a.date)||b.seq-a.seq);
    document.querySelector('#cc-history').innerHTML=entries.length?entries.map(e=>`<tr><td>${esc(e.name)} · ${e.last4}</td><td>${e.date}</td><td>${e.type==='payment'?'Payment':'Purchase / fee'}</td><td>${money(e.amount)}</td><td>${esc(e.note||'—')}</td></tr>`).join(''):'<tr><td colspan="5">No activity recorded.</td></tr>';
  }
  const field=(label,name,type,value='',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required></label>`;
  const amountField=(label,name,value=0)=>field(label+' (₹)',name,'number',value,'min="0" max="1000000000" step="0.01"');
  function open(action,id){
    if(blocked){status('Stored card data could not be read. Restore a valid card backup before making changes.');return;}
    const c=cards.find(c=>c.id===id);if(action!=='add'&&!c)return;
    if(action==='undo'){
      if(!confirm('Undo the last recorded activity for '+c.name+'? This changes only your local tracker.'))return;
      try{save(cards.map(card=>card.id===id?undoLast(card):card));status('Last card activity undone.');}catch(error){status(error.message);}return;
    }
    let fields='',title='';
    if(action==='edit'){title='Edit card details';fields=field('Card nickname','name','text',c.name,'maxlength="60"')+amountField('Credit limit','limit',c.limit/100);}
    if(action==='add'){
      title='Add a credit card';fields=field('Card nickname','name','text','','maxlength="60"')+field('Last four digits','last4','text','','pattern="[0-9]{4}" maxlength="4" inputmode="numeric"')+amountField('Credit limit','limit')+amountField('Current outstanding balance','opening');
    }
    if(action==='add'||action==='statement'){
      title=title||'Update statement';fields+=field('Statement date','statementDate','date',today(),`max="${today()}"`)+field('Payment due date','dueDate','date',today())+amountField('Unpaid statement balance','statement')+amountField('Minimum payment still due','minimum');
    }else if(action!=='edit'){title=action==='payment'?'Record a payment already made':'Record a purchase or fee';fields=amountField('Amount','amount')+field('Transaction date','date','date',today(),`max="${today()}"`)+field('Note or payment reference (optional, no account details)','note','text','','maxlength="100"').replace(' required','');}
    dialog.innerHTML=`<form id="cc-form"><div class="modal-header"><div><h2>${title}</h2><p class="muted">${c?esc(c.name)+' · '+c.last4:'Copy amounts from your card account.'}</p></div><button type="button" class="close-button" id="cc-close" aria-label="Close">×</button></div>${action==='statement'?'<p class="muted">Enter the amount still unpaid now, after payments already recorded here. This creates a new snapshot. Earlier activity cannot be undone after saving.</p>':''}<div class="form-grid">${fields}</div><p class="form-error" id="cc-error" role="alert" hidden></p><div class="modal-actions"><button class="button button-primary">Save record</button></div></form>`;
    dialog.querySelector('#cc-close').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();try{
      const values=Object.fromEntries(new FormData(e.target));const next=structuredClone(cards);const target=next.find(c=>c.id===id);
      if(action==='edit'){
        const limit=cents(values.limit);if(!limit||!values.name.trim()||values.name.trim().length>60)throw Error('Enter a card nickname and positive credit limit.');target.name=values.name.trim();target.limit=limit;
      }else if(action==='add'||action==='statement'){
        const statement=cents(values.statement),min=cents(values.minimum);
        if(!dateOK(values.statementDate)||!dateOK(values.dueDate)||values.statementDate>today()||values.dueDate<values.statementDate)throw Error('Check statement and due dates.');
        if(target && values.statementDate<target.statementDate)throw Error('New statements cannot be earlier than the current statement.');
        if(min>statement)throw Error('Minimum due cannot exceed the unpaid statement balance.');
        const opening=action==='add'?cents(values.opening):balance(target);
        if(statement>opening)throw Error('Unpaid statement balance cannot exceed recorded outstanding balance.');
        const update={statement,minimum:min,statementDate:values.statementDate,dueDate:values.dueDate,statementSeq:target?.entries.at(-1)?.seq||0};
        if(action==='add'){if(!values.name.trim()||!/^\d{4}$/.test(values.last4))throw Error('Enter a nickname and exactly four digits.');const limit=cents(values.limit);if(!limit)throw Error('Credit limit must be positive.');next.push({id:crypto.randomUUID(),name:values.name.trim(),last4:values.last4,limit,opening,entries:[],...update});}
        else Object.assign(target,update);
      }else{
        const amount=cents(values.amount);if(!amount)throw Error('Amount must be positive.');if(!dateOK(values.date)||values.date>today())throw Error('Choose a valid date, no later than today.');
        if(action==='payment'&&amount>balance(target))throw Error('Payment cannot exceed the recorded outstanding balance.');
        if(target.entries.length && values.date<target.entries.at(-1).date)throw Error('Record activity in date order, or undo the latest activity first.');
        if(values.date<target.statementDate)throw Error('Use an activity date on or after the current statement date. Earlier activity belongs in the starting balance.');
        target.entries.push({seq:(target.entries.at(-1)?.seq||0)+1,type:action,amount,date:values.date,note:values.note.trim()});
      }
      save(next);dialog.close();status('Card record saved. No bank payment was initiated.');
    }catch(error){dialog.querySelector('#cc-error').hidden=false;dialog.querySelector('#cc-error').textContent=error.message;}};
    dialog.showModal();
  }
  root.addEventListener('click',e=>{const b=e.target.closest('[data-cc-action]');if(b)open(b.dataset.ccAction,b.dataset.id);});
  document.querySelector('#cc-add').onclick=()=>open('add');
  document.querySelector('#cc-backup').onclick=()=>{if(blocked){status('Cannot export unreadable data.');return;}const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,cards},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='campus-credit-cards.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.querySelector('#cc-restore').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10000000)throw Error('File exceeds 10 MB.');const data=JSON.parse(await file.text());if(data.version!==1)throw Error('Unsupported backup.');valid(data.cards);if(confirm('Replace all tracked cards and their activity with this backup?')){save(data.cards);status('Card backup restored.');}}catch(error){status(error.message);}finally{e.target.value='';}};
  window.creditCardAdvice = () => {
    if(blocked)return 'Card data could not be read. Check the Credit cards section.';
    if(!cards.length)return 'Add a card and your latest unpaid statement balance in Credit cards first.';
    return cards.map(c=>`${c.name} ending ${c.last4}: outstanding ${money(balance(c))}; statement still due ${money(due(c))}; minimum still due ${money(minimum(c))}; due date ${c.dueDate}${due(c)>0&&c.dueDate<today()?' (overdue)':''}.`).join(' ')+' These figures use your manual records. Confirm balances and payment receipts with your issuer.';
  };
  render();if(blocked)status('Card storage could not be read. Existing data has not been overwritten.');
})();
