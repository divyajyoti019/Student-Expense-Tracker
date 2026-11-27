# Five-minute demo and viva guide

**Project:** Campus Ledger — Student Expense & Budget Tracker
**Team:** Divya Jyoti Verma and Lakshya Khasa

Use synthetic data in a fresh browser profile or a separate local-server port. Do not clear existing project records. Keep the server running and use the same address throughout the demonstration. Prepare the entries below before presenting so most of the time can be spent explaining results.

## Prepare a small dataset

Start the app from the repository folder:

```sh
python3 -m http.server 8001 --bind 127.0.0.1
```

Open `http://127.0.0.1:8001`, select the current month, and use today's date for expenses, income, shared bills, and card activity. Dates for received income and already-paid activity must not be in the future.

| Module | Demo records | Expected result |
| --- | --- | --- |
| Budget | ₹10,000 for the selected month | Monthly limit ₹10,000 |
| Expenses | Lunch ₹300 Food/UPI; Books ₹700 Education/Cash; Movie ₹500 Entertainment/Card | Spent ₹1,500; 3 transactions; average ₹500; ₹8,500 budget remaining |
| Income | ₹12,000 Allowance received today | Income ₹12,000; remaining before bills ₹10,500 |
| Bill | Hostel rent ₹3,000, unpaid, due later in the same selected month (or today if it is the last day) | Unpaid bills ₹3,000; estimated after bills ₹7,500 |
| Savings goal | Laptop fund: target ₹30,000, saved ₹6,000, deadline about 90 days away | 20% complete; ₹24,000 remaining; approximately ₹8,000 per 30-day period if exactly 90 days remain |
| Shared group | Group “Hostel groceries”; members in order: Divya, Lakshya, Roommate; ₹100 bill paid by Divya | Divya gets ₹66.66; Lakshya owes ₹33.33; Roommate owes ₹33.33 |
| Card | Demo Card, last four 1234, limit ₹20,000, opening balance ₹2,000, unpaid statement ₹1,500, minimum ₹150; statement today, due in the future | Outstanding ₹2,000; utilization 10%; statement due ₹1,500 |

The ₹100 shared bill allocates ₹33.34 to the first member and ₹33.33 to each other member. “Roommate” is a fictional demo participant, not an additional project team member.

## Timed presentation

**0:00–0:40 — Problem and dashboard**
Introduce both team members and the problem: students need to plan allowance, bills, saving goals, and shared purchases as well as record spending. Show the ₹1,500 monthly total, ₹10,000 budget, category chart, and searchable transaction list. Explain that the selected month drives these values.

**0:40–1:30 — Student planner**
Show ₹12,000 income, ₹1,500 expenses, ₹3,000 reserved bills, and ₹7,500 estimated after bills. Explain the formula. Show the goal's 20% progress. Demonstrate a what-if saving amount without modifying actual records. Mention that marking a bill paid is a reminder update; the actual expense must also be recorded once.

**1:30–2:30 — Exact shared expense splitting**
Show the three members' balances and settlement suggestions for the ₹100 bill. Record a ₹10 payment from Lakshya to Divya, already made in this fictional scenario. Lakshya should now owe ₹23.33, Roommate ₹33.33, and Divya should receive ₹56.66. Explain the remainder paise and that the module never transfers money. Open group history.

**2:30–3:15 — Card statement and correction**
Record a ₹500 payment for Demo Card. Outstanding becomes ₹1,500, statement due becomes ₹1,000, minimum due becomes ₹0, and utilization becomes 7.5%. Explain why zero minimum due does not mean the statement is fully paid. Show “Undo last activity” as a correction option before a new statement checkpoint. Card repayment does not inflate the personal expense total.

**3:15–4:10 — Outlook and assistant**
Show the month-end projection and its assumption of unchanged daily average. Move the spending-reduction slider to 20%; for ₹500 Entertainment and no Shopping, the hypothetical reduction is ₹100. Ask “allowance and goals”, “shared expenses”, or “credit card dues”. Explain that keyword rules use the saved records, with no external AI call.

**4:10–5:00 — Reports, persistence, and engineering**
Download the monthly HTML summary and open it; show the Print → Save as PDF option. Explain the four separate JSON backups. Reload the application to demonstrate persistence. Finish with the exact-paise algorithm, validated restore, and independent C version as the technical contributions.

## Short technical answers

**Why use integer paise?**
It makes split allocations and settlement sums exact. ₹100 becomes 10,000 paise. Integer division gives 3,333 each with remainder 1; the first member receives that extra paise. No paise is created or lost.

**How do balances stay conserved?**
For a bill, debit every share and credit the payer with the full total. These changes sum to zero. A settlement adds its amount to the debtor's negative balance and subtracts the same amount from the creditor's positive balance, also preserving zero.

**What does greedy settlement mean here?**
Match one debtor and one creditor for the smaller amount, then continue with any nonzero balance. Each step clears at least one party. It produces a valid plan in a linear pass after balances are computed; it does not guarantee the fewest transactions in every possible case.

**Is the forecast machine learning?**
No. It is `recorded spending through today / elapsed days × days in month`, rounded to paise. On day 10 of a 30-day month, ₹1,000 spent gives a ₹3,000 estimate. Future-dated entries are excluded from the projection but remain in monthly totals. Missing entries and one-off purchases change its usefulness.

**How are different month lengths compared?**
The outlook compares the same day range in both months, capped at the previous month's length. A completed 31-day month compared with a 28-day February uses their first 28 days for comparison.

**Why is the planner estimate not a bank balance?**
It subtracts selected-month expenses and unpaid bills from selected-month received income. It has no opening balance, prior-month carry-forward, or bank synchronization.

**Why use a statement checkpoint?**
The entered unpaid statement already reflects earlier payments. Saving the last activity sequence as a checkpoint means only later payments are deducted from that snapshot, preventing a double deduction.

**What makes the bot a rule-based assistant?**
Regular-expression keyword checks choose a calculation/explanation function. The answers are deterministic and limited to supported topics; no model was trained and no API key is required.

**Why are there four backups?**
The modules have independent models and validation. The main ledger backup contains expenses and budgets only. Planner, group, and card backups must also be saved to preserve all records.

**What C concepts can be demonstrated?**
Structures organize records; an enum tags the payment union; dynamic arrays store collections; modules separate responsibilities; checked input and date parsing validate records; versioned binary files persist state. The C app runs independently and does not use browser `localStorage`.

## Before submission

Run the checks documented in the README, use sample rather than personal payment data, fill institution/roll/guide details in the required college format, and keep the project report consistent with the demonstrated features. Do not claim live bank integration, automatic payment, trained AI, cloud sync, or production security.
