(function () {
  'use strict';
  const LIMIT = 100000000000;
  const uid = () => globalThis.crypto.randomUUID();
  const dateOK = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value;
  const integerAmount = value => Number.isSafeInteger(value) && value > 0 && value <= LIMIT;
  function parseAmount(value) {
    if (!/^\d+(\.\d{1,2})?$/.test(String(value))) throw Error('Use a positive amount with up to two decimal places.');
    const amount = Math.round(Number(value) * 100);
    if (!integerAmount(amount)) throw Error('Amount must be between ₹0.01 and ₹1,000,000,000.');
    return amount;
  }
  function shares(amount, count) {
    if (!integerAmount(amount) || !Number.isInteger(count) || count < 2 || count > 20) throw Error('Invalid amount or member count.');
    const base = Math.floor(amount / count), remainder = amount % count;
    return Array.from({length:count}, (_, index) => base + (index < remainder ? 1 : 0));
  }
  function balances(group) {
    const result = Object.fromEntries(group.members.map(name => [name, 0]));
    for (const entry of group.entries) {
      if (entry.type === 'bill') {
        const allocation = shares(entry.amount, group.members.length);
        group.members.forEach((name,index) => {result[name] -= allocation[index];});
        result[entry.payer] += entry.amount;
      } else {
        result[entry.from] += entry.amount;
        result[entry.to] -= entry.amount;
      }
    }
    return result;
  }
  function suggestions(group) {
    const net = balances(group);
    const debtors = group.members.filter(n=>net[n]<0).map(name=>({name, amount:-net[name]}));
    const creditors = group.members.filter(n=>net[n]>0).map(name=>({name, amount:net[name]}));
    const result=[]; let d=0,c=0;
    while(d<debtors.length && c<creditors.length) {
      const amount=Math.min(debtors[d].amount,creditors[c].amount);
      result.push({from:debtors[d].name,to:creditors[c].name,amount});
      debtors[d].amount-=amount;creditors[c].amount-=amount;
      if(debtors[d].amount===0)d++;if(creditors[c].amount===0)c++;
    }
    return result;
  }
  function validateGroup(group) {
    const text = (s,max) => typeof s==='string' && s.trim().length>0 && s.length<=max;
    if(!group || !text(group.id,80) || !text(group.name,60) || !Array.isArray(group.members) || group.members.length<2 || group.members.length>20 || !group.members.every(n=>text(n,40) && n===n.trim()) || new Set(group.members.map(n=>n.toLowerCase())).size!==group.members.length || !Array.isArray(group.entries) || group.entries.length>1000) throw Error('Invalid group. Use 2–20 distinct member names.');
    const prefix={members:group.members,entries:[]}; const ids=new Set();
    for(const e of group.entries) {
      if(!e || !text(e.id,80) || ids.has(e.id) || !integerAmount(e.amount) || !dateOK(e.date)) throw Error('Invalid group activity.');
      ids.add(e.id);
      if(e.type==='bill') {
        if(!text(e.title,90) || !group.members.includes(e.payer)) throw Error('Invalid bill.');
      } else if(e.type==='settlement') {
        if(e.from===e.to || !group.members.includes(e.from) || !group.members.includes(e.to)) throw Error('Invalid settlement members.');
        const net=balances(prefix);
        if(e.amount > Math.min(-net[e.from],net[e.to])) throw Error('Settlement exceeds the outstanding amount.');
      } else throw Error('Unknown activity type.');
      prefix.entries.push(e);
    }
    return group;
  }
  function validate(data) {
    if(!data || data.version!==1 || !Array.isArray(data.groups) || data.groups.length>30) throw Error('Unsupported shared-expense backup.');
    data.groups.forEach(validateGroup);
    if(new Set(data.groups.map(g=>g.id)).size!==data.groups.length) throw Error('Duplicate group IDs.');
    return {version:1,groups:data.groups,selected:data.groups.some(g=>g.id===data.selected)?data.selected:(data.groups[0]?.id||'')};
  }
  if(typeof module!=='undefined' && module.exports) {module.exports={parseAmount,shares,balances,suggestions,validateGroup,validate};return;}
  const root=document.querySelector('#split-expenses'); if(!root)return;
  const KEY='campus-split-v1';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=cents=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(cents/100);
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  let state={version:1,groups:[],selected:''}, blocked=false;
  try{const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw));}catch{blocked=true;}
  root.innerHTML=`<div class="panel-heading"><div><p class="eyebrow">ROOMMATES & TRIPS</p><h2>Shared expenses</h2><p class="muted">Split group bills fairly and see who owes whom.</p></div></div><p class="split-notice">This is a manual group ledger on this device. It does not send money or add transactions to your personal expenses.</p><p id="split-message" role="status" aria-live="polite"></p><details class="split-create"><summary>Create a group</summary><form id="split-group-form" class="split-form"><label class="field">Group name<input name="name" maxlength="60" placeholder="e.g. Hostel groceries" required></label><label class="field">Members, separated by commas<input name="members" maxlength="820" placeholder="You, Aditi, Rahul" required><small>List yourself first. Use 2–20 unique names.</small></label><button class="button button-primary">Create group</button></form></details><div id="split-workspace"></div><div class="split-backup"><button class="button button-quiet" id="split-download">Backup groups</button><label class="button button-quiet">Restore groups<input type="file" id="split-upload" accept="application/json,.json" hidden></label></div>`;
  const message=text=>{root.querySelector('#split-message').textContent=text;};
  const current=()=>state.groups.find(g=>g.id===state.selected);
  function commit(next) {
    if(blocked)throw Error('Stored data could not be read. Restore a valid backup before making changes.');
    const checked=validate(next);localStorage.setItem(KEY,JSON.stringify(checked));state=checked;render();
  }
  function render() {
    const area=root.querySelector('#split-workspace'),g=current();
    if(!g){area.innerHTML='<div class="split-empty">Create a group to split your next meal, trip or hostel bill.</div>';return;}
    const options=g.members.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
    const net=balances(g), transfers=suggestions(g),total=g.entries.filter(e=>e.type==='bill').reduce((s,e)=>s+e.amount,0);
    area.innerHTML=`<div class="split-group-bar"><label class="field">Your groups<select id="split-group-select">${state.groups.map(item=>`<option value="${esc(item.id)}" ${item.id===g.id?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label><div><strong>${money(total)}</strong><span class="muted"> total shared bills · ${g.members.length} members</span></div><button class="button button-quiet" id="split-delete">Delete group</button></div><p class="split-notice">Bills split equally among all members. Any remainder of a few paise goes to members in the listed order. Membership stays fixed to preserve earlier splits.</p><div class="split-columns"><section><h3>Add a shared bill</h3><form id="split-bill-form" class="split-form"><label class="field">Description<input name="title" maxlength="90" placeholder="e.g. Groceries" required></label><label class="field">Total amount (₹)<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" placeholder="0.00" required></label><label class="field">Paid by<select name="payer">${options}</select></label><label class="field">Date<input name="date" type="date" value="${today()}" max="${today()}" required></label><button class="button button-primary">Split bill</button></form></section><section><h3>Member balances</h3><ul class="split-balances">${g.members.map(n=>`<li><span>${esc(n)}</span><strong class="${net[n]<0?'split-owes':'split-receives'}">${net[n]===0?'Settled':net[n]>0?'Gets back '+money(net[n]):'Owes '+money(-net[n])}</strong></li>`).join('')}</ul><h3>Suggested settlements</h3>${transfers.length?`<ul class="split-transfers">${transfers.map(t=>`<li>${esc(t.from)} pays <strong>${money(t.amount)}</strong> to ${esc(t.to)}</li>`).join('')}</ul>`:'<p class="muted">Everyone is settled up.</p>'}<p class="split-notice">Suggestions simplify net debts. Record a payment only after it has actually been made.</p></section></div><details class="split-settlement"><summary>Record a payment already made</summary><form id="split-payment-form" class="split-form"><label class="field">From<select name="from">${options}</select></label><label class="field">To<select name="to">${options}</select></label><label class="field">Amount (₹)<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" required></label><label class="field">Payment date<input name="date" type="date" value="${today()}" max="${today()}" required></label><button class="button button-primary">Record payment</button></form></details><details class="split-history"><summary>Group history (${g.entries.length} records)</summary><div class="table-scroll"><table><thead><tr><th>Date</th><th>Activity</th><th>Amount</th></tr></thead><tbody>${g.entries.length?g.entries.slice().reverse().map(e=>`<tr><td>${e.date}</td><td>${e.type==='bill'?esc(e.title)+' · paid by '+esc(e.payer):'Payment: '+esc(e.from)+' to '+esc(e.to)}</td><td>${money(e.amount)}</td></tr>`).join(''):'<tr><td colspan="3">No group activity yet.</td></tr>'}</tbody></table></div></details>`;
    area.querySelector('#split-group-select').onchange=e=>{try{commit({...state,selected:e.target.value});message('');}catch(err){message('Could not save: '+err.message);}};
    area.querySelector('#split-delete').onclick=()=>{if(!confirm('Delete this group and all its local history? Download a group backup first if needed.'))return;try{const groups=state.groups.filter(item=>item.id!==g.id);commit({...state,groups,selected:groups[0]?.id||''});message('Group deleted.');}catch(err){message('Could not save: '+err.message);}};
    area.querySelector('#split-bill-form').onsubmit=e=>{e.preventDefault();addActivity(e.target,'bill');};
    area.querySelector('#split-payment-form').onsubmit=e=>{e.preventDefault();addActivity(e.target,'settlement');};
  }
  function addActivity(form,type) {
    try{
      const values=Object.fromEntries(new FormData(form));
      if(!dateOK(values.date)||values.date>today())throw Error('Choose a valid date no later than today.');
      const entry={id:uid(),type,amount:parseAmount(values.amount),date:values.date};
      if(type==='bill'){entry.title=values.title.trim();entry.payer=values.payer;}else{entry.from=values.from;entry.to=values.to;}
      const next=structuredClone(state);next.groups.find(g=>g.id===next.selected).entries.push(entry);commit(next);message(type==='bill'?'Bill split and saved.':'Payment recorded. No money was transferred by this app.');
    }catch(err){message('Could not save: '+err.message);}
  }
  root.querySelector('#split-group-form').onsubmit=e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));const group={id:uid(),name:values.name.trim(),members:values.members.split(',').map(n=>n.trim()),entries:[]};commit({...state,groups:[...state.groups,group],selected:group.id});e.target.reset();root.querySelector('.split-create').open=false;message('Group created. Add your first bill.');}catch(err){message('Could not save: '+err.message);}};
  root.querySelector('#split-download').onclick=()=>{if(blocked){message('Cannot export unreadable stored data.');return;}const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='campus-shared-expenses.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Group backup downloaded.');};
  root.querySelector('#split-upload').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Backup must be under 5 MB.');const data=validate(JSON.parse(await file.text()));if(!confirm('Replace all shared-expense groups with this backup?'))return;localStorage.setItem(KEY,JSON.stringify(data));state=data;blocked=false;render();message('Shared-expense groups restored.');}catch(err){message('Restore failed: '+err.message);}finally{e.target.value='';}};
  window.splitExpensesAdvice=()=>{const g=current();if(!g)return 'Create a shared-expense group to calculate roommate or trip balances.';const rows=suggestions(g);return rows.length?g.name+': '+rows.map(t=>`${t.from} pays ${money(t.amount)} to ${t.to}`).join('; ')+'. These are local settlement suggestions, not bank transfers.':g.name+': everyone is settled up.';};
  render();if(blocked)message('Your saved group data could not be read. It has not been overwritten. Restore a valid backup to continue.');
})();
