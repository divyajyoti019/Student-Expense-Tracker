(() => {
  'use strict';

  const STORAGE_KEY = 'campus-ledger-v1';
  const CATEGORIES = [
    { name: 'Food', icon: '☕', color: '#4e9669', tint: '#eaf4ed' },
    { name: 'Transport', icon: '↗', color: '#7990cb', tint: '#edf0fa' },
    { name: 'Education', icon: '▤', color: '#d59a4b', tint: '#fbf3e7' },
    { name: 'Shopping', icon: '◇', color: '#bd78a0', tint: '#f8edf3' },
    { name: 'Entertainment', icon: '♫', color: '#9578c8', tint: '#f1eef8' },
    { name: 'Hostel', icon: '⌂', color: '#4c9aa0', tint: '#eaf4f4' },
    { name: 'Mobile & Internet', icon: '◉', color: '#d17e65', tint: '#faefeb' },
    { name: 'Healthcare', icon: '✚', color: '#ca6670', tint: '#faedef' },
    { name: 'Other', icon: '•', color: '#87938b', tint: '#eff2ef' },
  ];

  const $ = (selector) => document.querySelector(selector);
  const monthPicker = $('#month-picker');
  const expenseDialog = $('#expense-dialog');
  const budgetDialog = $('#budget-dialog');
  const deleteDialog = $('#delete-dialog');
  const expenseForm = $('#expense-form');
  const transactionsBody = $('#transaction-rows');
  let storageIssue = false;
  let state = loadState();
  let selectedMonth = localMonth().slice(0, 7);
  let pendingDeleteId = null;
  let toastTimer;
  let editingBudgetMonth;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!validState(saved)) throw Error('Invalid saved data');
      return {transactions:saved.transactions || [], budgets:saved.budgets || {}};
    } catch {
      storageIssue = true;
      return { transactions: [], budgets: {} };
    }
  }

  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  }
  function isValidTransaction(item) {
    return item && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.description === 'string' && item.description.trim().length > 0 && item.description.length <= 90 &&
      typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount >= .01 && item.amount <= 1e9 &&
      validDate(item.date) && CATEGORIES.some((category) => category.name === item.category) && ['UPI', 'Cash', 'Card'].includes(item.payment);
  }
  function validState(saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return false;
    const t=saved.transactions ?? [], b=saved.budgets ?? {};
    return Array.isArray(t) && t.length<=100000 && t.every(isValidTransaction) && new Set(t.map(x=>x.id)).size===t.length &&
      b && typeof b==='object' && !Array.isArray(b) && Object.entries(b).every(([month,amount])=>/^\d{4}-(0[1-9]|1[0-2])$/.test(month) && typeof amount==='number' && Number.isFinite(amount) && amount>=0 && amount<=1e9);
  }

  function persist() {
    if (storageIssue) { showToast('Saved data could not be read. Restore a valid backup before adding records.'); return false; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      showToast('Could not save. Your browser storage may be full.');
      return false;
    }
  }

  function localMonth(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function money(amount, compact = false) {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 0 : 2,
      notation: compact && value >= 100000 ? 'compact' : 'standard',
    }).format(value);
  }

  function monthDate() {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  function monthName(format = 'long') {
    return new Intl.DateTimeFormat('en-IN', { month: format, year: 'numeric' }).format(monthDate());
  }

  function selectedTransactions() {
    return state.transactions.filter((item) => item.date.startsWith(selectedMonth)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  function categoryFor(name) {
    return CATEGORIES.find((category) => category.name === name) || CATEGORIES[CATEGORIES.length - 1];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function render() {
    const monthItems = selectedTransactions().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const total = monthItems.reduce((sum, item) => sum + Math.round(item.amount*100), 0)/100;
    const budget = Number(state.budgets[selectedMonth]) || 0;
    const budgetPercent = budget > 0 ? (total / budget) * 100 : 0;

    $('#spent-total').textContent = money(total);
    $('#spent-subtitle').textContent = monthItems.length ? `${money(total)} across ${monthItems.length} ${monthItems.length === 1 ? 'transaction' : 'transactions'}` : 'No expenses recorded yet';
    $('#budget-total').textContent = Object.hasOwn(state.budgets, selectedMonth) ? money(budget) : 'Not set';
    $('#budget-month-label').textContent = `Budget for ${monthName()}`;
    $('#budget-amount').value = state.budgets[selectedMonth] ?? '';
    editingBudgetMonth = selectedMonth;
    $('#edit-budget').textContent = budget > 0 ? 'Edit budget' : 'Set budget';
    $('#budget-caption').textContent = budget > 0
      ? budgetPercent > 100 ? `${money(total - budget)} over your monthly limit` : `${money(Math.max(0, budget - total))} left · ${Math.min(100, Math.round(budgetPercent))}% used`
      : Object.hasOwn(state.budgets,selectedMonth) ? `Zero budget · ${money(total)} spent` : 'Set a budget to track your limit';
    const progress = $('#budget-progress');
    progress.style.width = `${Math.min(100, budgetPercent)}%`;
    progress.className = budgetPercent >= 100 ? 'over' : budgetPercent >= 80 ? 'warning' : '';
    $('#transaction-count').textContent = String(monthItems.length);
    $('#transaction-subtitle').textContent = monthName();
    $('#average-expense').textContent = money(monthItems.length ? total / monthItems.length : 0);
    $('#average-subtitle').textContent = monthItems.length ? 'Per transaction' : 'Add an expense to begin';
    $('#trend-month').textContent = monthName('short');
    $('#today-label').textContent = `YOUR ${monthName().toUpperCase()} MONEY, IN FOCUS`;
    $('#breadcrumb-label').textContent = 'Overview';
    $('#transactions-caption').textContent = `Showing ${monthName()} transactions`;
    $('#donut-total').textContent = money(total, true);

    renderChart(monthItems);
    renderCategories(monthItems, total);
    renderTransactions(monthItems);
    document.dispatchEvent(new CustomEvent('ledger-updated'));
  }

  function renderChart(items) {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daily = Array(daysInMonth).fill(0);
    items.forEach((item) => { daily[Number(item.date.slice(8, 10)) - 1] += Number(item.amount); });
    const peak = Math.max(...daily, 1);
    const step = peak <= 500 ? 100 : Math.pow(10, Math.floor(Math.log10(peak / 4))) * Math.ceil((peak / 4) / Math.pow(10, Math.floor(Math.log10(peak / 4))));
    const ceiling = Math.max(step * 4, Math.ceil(peak / step) * step);
    [4, 3, 2, 1].forEach((level, index) => { $(`#chart-y-${level}`).textContent = money((ceiling * (level - 1)) / 3, true); });
    const points = daily.map((value, index) => {
      const x = 10 + (index * 680) / Math.max(1, daysInMonth - 1);
      const y = 192 - (value / ceiling) * 175;
      return [x, y];
    });
    const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const first = points[0];
    const last = points[points.length - 1];
    const area = `${first[0]},192 ${line} ${last[0]},192`;
    const dots = points.filter((_, index) => daily[index] > 0).map(([x, y]) => `<circle class="chart-point" cx="${x}" cy="${y}" r="4"></circle>`).join('');
    $('#trend-chart').innerHTML = `<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#5ca276" stop-opacity=".22"/><stop offset="100%" stop-color="#5ca276" stop-opacity="0"/></linearGradient></defs><polygon class="chart-fill" points="${area}"/><polyline class="chart-line" points="${line}"/>${dots}`;
    const labels = [1, Math.round(daysInMonth * .25), Math.round(daysInMonth * .5), Math.round(daysInMonth * .75), daysInMonth]
      .filter((day, index, list) => list.indexOf(day) === index);
    $('#chart-labels').innerHTML = labels.map((day) => `<span>${day}</span>`).join('');
  }

  function renderCategories(items, total) {
    const totals = new Map();
    items.forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + Number(item.amount)));
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const slices = ranked.map(([name, amount]) => ({ ...categoryFor(name), angle: total ? (amount / total) * 360 : 0 }));
    let cursor = 0;
    const gradient = slices.map((slice) => {
      const start = cursor;
      cursor += slice.angle;
      return `${slice.color} ${start}deg ${cursor}deg`;
    }).join(', ');
    $('#category-donut').style.background = gradient ? `conic-gradient(${gradient})` : 'conic-gradient(#e9efea 0deg 360deg)';
    const top = ranked;
    $('#category-legend').innerHTML = top.length
      ? top.map(([name, amount]) => {
        const category = categoryFor(name);
        return `<div class="legend-row"><span class="legend-swatch" style="background:${category.color}"></span><span class="legend-name">${escapeHtml(name)}</span><strong class="legend-value">${Math.round((amount / total) * 100)}%</strong></div>`;
      }).join('')
      : '<div class="category-empty">Add a few expenses to see your category breakdown.</div>';
  }

  function renderTransactions(items) {
    const query = $('#search-input').value.trim().toLowerCase();
    const categoryFilter = $('#category-filter').value;
    const filtered = items.filter((item) => (categoryFilter === 'all' || item.category === categoryFilter) &&
      (!query || `${item.description} ${item.category} ${item.payment}`.toLowerCase().includes(query)));
    const order = $('#sort-order').value;
    filtered.sort((a,b) => order === 'highest' ? b.amount-a.amount : order === 'lowest' ? a.amount-b.amount : order === 'oldest' ? a.date.localeCompare(b.date) || a.id-b.id : b.date.localeCompare(a.date) || b.id-a.id);
    const hasMonthItems = items.length > 0;
    $('#empty-state').classList.toggle('visible', filtered.length === 0);
    transactionsBody.hidden = filtered.length === 0;
    if (!filtered.length) {
      $('#empty-title').textContent = hasMonthItems ? 'No matching expenses' : 'Your ledger starts here';
      $('#empty-copy').textContent = hasMonthItems ? 'Try another search or category filter.' : 'Add your first expense to see it in your dashboard.';
      $('#empty-add').hidden = hasMonthItems;
    }
    $('#rows-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'transaction' : 'transactions'}`;
    transactionsBody.innerHTML = filtered.map((item) => {
      const category = categoryFor(item.category);
      const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${item.date}T12:00:00`));
      return `<tr><td><div class="expense-name"><span class="category-avatar" style="color:${category.color};background:${category.tint}">${category.icon}</span><span class="expense-description" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</span></div></td><td><span class="category-chip">${escapeHtml(item.category)}</span></td><td>${date}</td><td><span class="payment-pill"><i class="payment-dot"></i>${escapeHtml(item.payment)}</span></td><td class="amount-column">${money(item.amount)}</td><td><div class="row-actions"><button class="row-action" data-edit="${item.id}" aria-label="Edit ${escapeHtml(item.description)}" title="Edit">✎</button><button class="row-action" data-delete="${item.id}" aria-label="Delete ${escapeHtml(item.description)}" title="Delete">×</button></div></td></tr>`;
    }).join('');
  }

  function setCategoryOptions() {
    $('#expense-category').innerHTML = CATEGORIES.map(({ name }) => `<option>${escapeHtml(name)}</option>`).join('');
    $('#category-filter').innerHTML = '<option value="all">All categories</option>' + CATEGORIES.map(({ name }) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  }

  function openExpense(item = null) {
    expenseForm.reset();
    $('#form-error').hidden = true;
    $('#expense-id').value = item ? item.id : '';
    $('#expense-dialog-title').textContent = item ? 'Edit expense' : 'Add an expense';
    $('#save-expense').textContent = item ? 'Save changes' : 'Save expense';
    $('#expense-description').value = item ? item.description : '';
    $('#expense-amount').value = item ? item.amount : '';
    $('#expense-date').max = localMonth();
    $('#expense-date').value = item ? item.date : localMonth();
    $('#expense-category').value = item ? item.category : 'Food';
    $('#expense-payment').value = item ? item.payment : 'UPI';
    expenseDialog.showModal();
    $('#expense-description').focus();
  }

  function openBudget() {
    $('#budget-error').hidden = true;
    $('#budget-month-label').textContent = `Set a spending limit for ${monthName()}.`;
    editingBudgetMonth = selectedMonth;
    $('#budget-amount').value = state.budgets[selectedMonth] ?? '';
    budgetDialog.scrollIntoView({behavior:'smooth', block:'center'});
    $('#budget-amount').focus();
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function exportCsv() {
    const items = selectedTransactions().sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    if (!items.length) { showToast('No expenses to export for this month.'); return; }
    const safeCell = (value) => {
      let text = String(value);
      if (/^[=+@\-]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [['Date', 'Description', 'Category', 'Payment', 'Amount (INR)'], ...items.map((item) => [item.date, item.description, item.category, item.payment, Number(item.amount).toFixed(2)])];
    const blob = new Blob([`\ufeff${rows.map((row) => row.map(safeCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus-ledger-${selectedMonth}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Monthly CSV report downloaded.');
  }


  $('#sort-order').addEventListener('change', () => renderTransactions(selectedTransactions()));
  function suggest(question) {
    const items = selectedTransactions();
    const spent = items.reduce((sum,t) => sum + Math.round(Number(t.amount)*100),0)/100;
    const budget = Number(state.budgets[selectedMonth]) || 0;
    const remaining = budget - spent;
    const totals = {};
    items.forEach(t => totals[t.category]=(totals[t.category]||0)+Number(t.amount));
    const ranked = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
    const q=question.toLowerCase();
    let reply;
    if (/split|shared|roommate|group|settle|owes|owe/.test(q)) reply = window.splitExpensesAdvice ? window.splitExpensesAdvice() : 'Open Shared expenses to create a group and record a bill.';
    else if (/credit|card/.test(q)) reply = window.creditCardAdvice ? window.creditCardAdvice() : 'See the Credit cards section for statement details.';
    else if (/allowance|goal|income|bill|scholarship/.test(q)) reply = window.studentPlannerAdvice ? window.studentPlannerAdvice() : 'Open Student planner to record your allowance and goals.';
    else if (/forecast|pace|projection/.test(q)) reply = window.financeAdvice ? window.financeAdvice() : 'See Spending outlook.';
    else if (/credit|card|due/.test(q)) reply = window.creditCardAdvice ? window.creditCardAdvice() : 'See the Credit cards section for statement details.';
    else if (/category|categories|most|where/.test(q)) reply = ranked.length ? 'Category totals: '+ranked.map(([c,a])=>c+' '+money(a)).join('; ')+'.' : 'Add an expense to see which categories account for your spending.';
    else if (/budget|daily|day|left|spend|save|saving|tip|help/.test(q)) {
      reply = `For ${monthName()}, you recorded ${money(spent)} across ${items.length} expenses. `;
      if (!budget) reply += 'Set a positive monthly budget above to calculate your remaining allowance. ';
      else if (remaining < 0) reply += `You are ${money(-remaining)} over budget. Review optional purchases before adding more. `;
      else {
        reply += `${money(remaining)} remains from your ${money(budget)} budget. `;
        if (selectedMonth===localMonth().slice(0,7)) {const now=new Date();const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate()+1;reply+=`An even allowance is ${money(remaining/days)} per day over the remaining ${days} days, including today. Reserve money for any bills still due. `;}
      }
      if (/save|saving|tip/.test(q) && ranked.length) reply+=`Your largest recorded category is ${ranked[0][0]} at ${money(ranked[0][1])}. Review individual purchases there for optional costs; keep essential needs covered.`;
    } else reply='I can help with budgets, income, bills, savings goals, shared expenses, credit cards and spending forecasts. Try “How much can I spend each day?”';
    $('#assistant-reply').textContent=reply;
  }
  $('#assistant-form').addEventListener('submit', e=>{e.preventDefault();suggest($('#assistant-question').value);});
  document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>suggest(b.dataset.question)));
  $('#download-backup').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,...state},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='campus-ledger-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#backup-status').textContent='Backup downloaded. Keep it somewhere safe.';
  });
  $('#restore-backup').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {
      if(file.size>10000000)throw Error('Backup must be smaller than 10 MB.');
      const data=JSON.parse(await file.text());
      if(data.version!==1 || !Array.isArray(data.transactions) || data.transactions.length>100000 || !data.transactions.every(isValidTransaction) || !data.budgets || typeof data.budgets!=='object' || Array.isArray(data.budgets))throw Error('Invalid backup format.');
      if(new Set(data.transactions.map(t=>t.id)).size!==data.transactions.length)throw Error('Backup contains duplicate IDs.');
      for(const [month,amount] of Object.entries(data.budgets))if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>1e9)throw Error('Invalid budget in backup.');
      if(!confirm(`Replace your ledger with ${data.transactions.length} expenses and ${Object.keys(data.budgets).length} budgets? Download your current backup first if needed.`))return;
      if(!validState(data)) throw Error('Invalid expense backup.');
      const previous=state, previousIssue=storageIssue;state={transactions:data.transactions,budgets:data.budgets};storageIssue=false;if(!persist()){state=previous;storageIssue=previousIssue;throw Error('Could not save restored data.');}render();$('#backup-status').textContent='Backup restored successfully.';
    }catch(error){$('#backup-status').textContent=error.message;}finally{e.target.value='';}
  });

  window.ledgerSnapshot = () => structuredClone({...state,selectedMonth});
  setCategoryOptions();
  monthPicker.value = selectedMonth;
  render();
  if(storageIssue) { $('#backup-status').textContent='Saved ledger could not be read. Your existing storage is preserved. Restore a valid backup here to recover.'; }

  $('#add-expense-top').addEventListener('click', () => openExpense());
  $('#empty-add').addEventListener('click', () => openExpense());
  $('#edit-budget').addEventListener('click', openBudget);
  $('#export-csv').addEventListener('click', exportCsv);
  monthPicker.addEventListener('change', () => { if (monthPicker.value) { selectedMonth = monthPicker.value; render(); } });
  $('#search-input').addEventListener('input', () => renderTransactions(selectedTransactions()));
  $('#category-filter').addEventListener('change', () => renderTransactions(selectedTransactions()));
  $('#category-info').addEventListener('click', () => showToast('This chart groups your selected month’s expenses by category.'));

  expenseForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Number($('#expense-amount').value);
    const description = $('#expense-description').value.trim();
    const date = $('#expense-date').value;
    if (!description || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000 || !validDate(date) || date > localMonth()) {
      $('#form-error').textContent = 'Enter a description, a valid amount, and a date.';
      $('#form-error').hidden = false;
      return;
    }
    const id = Number($('#expense-id').value);
    const before = state.transactions;
    const entry = { id: id || state.transactions.reduce((max,t)=>Math.max(max,t.id+1),Date.now()), description, amount: Math.round(amount * 100) / 100, date, category: $('#expense-category').value, payment: $('#expense-payment').value };
    state.transactions = id ? state.transactions.map((transaction) => transaction.id === id ? entry : transaction) : [...state.transactions, entry];
    if (!persist()) { state.transactions = before; $('#form-error').textContent='Could not save. Check browser storage or the backup recovery message.'; $('#form-error').hidden=false; return; }
    expenseDialog.close();
    if (date.startsWith(selectedMonth) === false) { selectedMonth = date.slice(0, 7); monthPicker.value = selectedMonth; }
    render();
    showToast(id ? 'Expense updated.' : 'Expense saved.');
  });

  $('#budget-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Number($('#budget-amount').value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) {
      $('#budget-error').textContent = 'Enter a valid monthly budget.';
      $('#budget-error').hidden = false;
      return;
    }
    $('#budget-error').hidden = true;
    const previous = state.budgets[selectedMonth];
    state.budgets[selectedMonth] = amount;
    if (!persist()) { if (previous === undefined) delete state.budgets[selectedMonth]; else state.budgets[selectedMonth] = previous; $('#budget-error').textContent = 'Your browser blocked saving. Open the app at the app’s local server address in Chrome or Safari and allow site storage.'; $('#budget-error').hidden = false; return; }

    render();
    showToast('Monthly budget saved.');
  });

  transactionsBody.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit]');
    const deleteButton = event.target.closest('[data-delete]');
    if (editButton) {
      const item = state.transactions.find((transaction) => transaction.id === Number(editButton.dataset.edit));
      if (item) openExpense(item);
    }
    if (deleteButton) {
      pendingDeleteId = Number(deleteButton.dataset.delete);
      deleteDialog.showModal();
    }
  });

  $('#confirm-delete').addEventListener('click', (event) => {
    event.preventDefault();
    const before = state.transactions;
    state.transactions = state.transactions.filter((item) => item.id !== pendingDeleteId);
    if (!persist()) { state.transactions = before; return; }
    deleteDialog.close();
    pendingDeleteId = null;
    render();
    showToast('Expense deleted.');
  });

  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
  document.querySelectorAll('[data-nav]').forEach((link) => link.addEventListener('click', () => {
    document.querySelectorAll('[data-nav]').forEach((nav) => nav.classList.toggle('active', nav === link));
    $('#breadcrumb-label').textContent = link.textContent.trim();
  }));
  [expenseDialog, deleteDialog].forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  }));
})();
