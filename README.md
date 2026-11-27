# Campus Ledger — Student Expense & Budget Tracker

A local student finance dashboard with an original C terminal implementation. Record everyday spending, plan allowance and bills, save towards a goal, split hostel or trip expenses, and track credit card dues in one browser page.

**Project team:** Divya Jyoti Verma and Lakshya Khasa
**Academic level:** Third-year project · **Currency:** Indian Rupees (₹)

## Run the web app

From the repository folder, start a local server:

```sh
cd Student-Expense-Tracker
python3 -m http.server 8001 --bind 127.0.0.1
```

Open [http://127.0.0.1:8001](http://127.0.0.1:8001) in a modern browser. If your terminal is already inside this repository, omit the `cd` command. On Windows, `py -m http.server 8001 --bind 127.0.0.1` is an alternative. Stop the server with `Ctrl+C`.

Python 3 serves the static files; the application runs in the browser using HTML, CSS, and JavaScript. No account, API key, database installation, npm package, or paid service is required. Use the same browser profile and address/port each time to access the same saved records.

## What the browser app includes

| Area | Implemented features |
| --- | --- |
| Expense dashboard | Add, edit, and delete dated expenses; nine categories; Cash, UPI, and Card labels; monthly totals and average; daily and category charts; search, category filtering, and date/amount sorting |
| Monthly budget | Inline budget editor for the selected month, remaining amount and utilization, spending warnings, and an explicit zero-budget state |
| Student money planner | Record received allowance, scholarship, internship, part-time, and other income; compare it with the selected month's expenses; reserve unpaid bills and show an estimated amount after bills |
| Bills and savings | Dated bills with paid/unpaid and overdue status; one savings goal with target, saved amount, deadline, progress, and an approximate monthly contribution; daily-saving what-if calculator |
| Shared expenses | Multiple named groups of 2–20 members; equal bill splitting with exact paise; payer selection; member balances; suggested settlements; partial payment records and history; overpayment prevention |
| Credit card tracker | Nickname and last four digits, limit, outstanding balance, utilization, unpaid statement balance, minimum due, statement/due dates, charges and payments, activity history, nickname/limit editing, and undo of eligible latest activity |
| Spending outlook | Comparison with the same number of days in the previous month; current-month spending projection; shopping/entertainment reduction scenario |
| Suggestion assistant | Local keyword rules that explain budgets, categories, planner values, group debts, card dues, and the spending forecast using recorded data |
| Exports and backups | Monthly expense CSV, printable monthly HTML summary, and separate validated JSON backup/restore controls for each data module |

The nine expense categories are Food, Transport, Education, Shopping, Entertainment, Hostel, Mobile & Internet, Healthcare, and Other. Custom categories are available in the C version only.

## How the records relate

The main ledger contains personal expenses. The planner reads those expenses to calculate `received income − expenses − unpaid bills` for the selected month. It does not carry opening cash or a previous month's balance forward, so this is a planning estimate rather than a bank balance.

Marking a bill paid changes its reminder status only. Record the actual expense once in the main ledger when it is paid. Savings progress is manually entered and does not transfer money or deduct an amount from the planner.

Shared expenses and credit card activity are independent records. A shared bill or settlement does not create a personal expense. A card purchase or repayment does not change the dashboard. Record a purchase once in the personal ledger if it should appear in spending charts; avoid also counting its later repayment as a second expense.

Card statements are manual snapshots: enter the **amount still unpaid now**, after accounting for already-recorded payments. Later recorded payments reduce that snapshot's statement and minimum dues. Later purchases increase outstanding balance without changing the current statement due. Activity must be entered in date order. Only the latest activity after the current statement snapshot can be undone.

The assistant uses deterministic rules, not machine learning or a remote AI API. Reminders appear when the page is open; the app does not send background notifications, connect to banks, calculate issuer interest, or initiate payments.

## Save and back up your work

Data is stored in this browser's `localStorage`, separately for each module:

| Backup control | Contents | Storage key |
| --- | --- | --- |
| Download backup | Personal expenses and monthly budgets | `campus-ledger-v1` |
| Download planner backup | Income, bills, and savings goal | `campus-student-plan-v1` |
| Backup groups | Shared groups, bills, and settlements | `campus-split-v1` |
| Backup cards | Cards, statement snapshots, and activity | `campus-ledger-cards-v1` |

Download **all four JSON backups** to preserve the complete browser project data. Restore validates the corresponding file and asks before replacing that module's records. CSV and HTML exports are reports, not complete restorable backups. The monthly HTML report contains main-ledger expenses, budget, and category totals; it excludes planner, shared-expense, and card records. Open the HTML file in a browser and choose Print → Save as PDF if needed.

Changing browser, profile, hostname, or port creates a different storage area. Clearing site data or using a temporary/private session can remove records. There is no cloud synchronization, login, encryption, or multi-user collaboration. Use card nicknames and last four digits only; never enter full card numbers, CVVs, PINs, or passwords.

## Algorithms worth demonstrating

- **Exact paise splitting:** ₹100.00 is 10,000 paise. Three members receive shares of 3,334, 3,333, and 3,333 paise. The few remainder paise go to members in the saved order, so shares always add up to the bill.
- **Greedy settlement:** calculate each member's net credit/debt, then repeatedly match one debtor with one creditor for the smaller remaining amount. Each transfer clears at least one balance. This produces a valid settlement plan; it does not guarantee the fewest transfers for every group.
- **Spending projection:** current-month recorded spending through today ÷ elapsed calendar days × days in the month. Future-dated entries remain in monthly totals but are excluded from the projection. This assumes the recorded daily average continues. It is a simple estimate, not a prediction learned from data.
- **Savings goal:** divide the remaining target by the number of 30-day periods until the deadline, rounding the suggested contribution up to a paise. Completed and overdue goals receive distinct status.

## Project files

| Files | Responsibility |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Browser layout, expense ledger, budgets, charts, assistant, CSV and ledger backup |
| `student-planner.js`, `student-planner.css` | Income, bills, savings goal, what-if planning, planner backup |
| `split-expenses.js`, `split-expenses.css` | Groups, exact splitting, settlements, history, group backup |
| `credit-cards.js` | Card balances, statement checkpoints, payments, and card backup |
| `finance-insights.js` | Month comparison, linear projection, reduction scenario, HTML report |
| `main.c`, `common.h` | C entry point, shared types, application state |
| `expense.c/.h`, `budget.c/.h`, `reports.c/.h` | C expense operations, budgets, reports |
| `storage.c/.h`, `validation.c/.h`, `date_utils.c/.h`, `ui.c/.h` | C persistence, input/date validation, terminal UI |
| `tests/` | C assertions/smoke checks and focused JavaScript calculation checks |
| `docs/project_report.md` | Report covering the browser system and original C implementation |
| `docs/demo_guide.md` | Five-minute demonstration and viva explanations |

## Run the C terminal app

The original C11 implementation remains available for demonstrating structures, enums, a tagged union, pointers, dynamic arrays, validation, and file handling. It supports expense CRUD, persistent custom categories, monthly budgets, search/sort/filter, daily/monthly/yearly and other reports, and monthly text export. The newer planner, group-splitting, card statement, and outlook interfaces belong to the browser version.

Requirements: a C11-compatible compiler and `make`.

```sh
make
make run
```

The C app stores independent records in `data/expenses.dat`, `data/budgets.dat`, and `data/categories.dat`; exports go to `reports/`. These records do not sync with the browser. Back up both directories when moving the terminal app's data. Its versioned binary structures are intended for the same compiler/architecture and are not a portable interchange format.

Plain text works by default. Optional terminal color:

```sh
EXPENSE_TRACKER_COLOR=1 make run
```

`NO_COLOR` or `TERM=dumb` disables color. `make clean` removes build outputs, not saved records.

## Verification

Node.js is needed only for the JavaScript checks; it is not needed to run the web app.

```sh
node tests/student-planner.cjs
node tests/split-expenses.cjs
node tests/credit-cards.cjs
node tests/finance-insights.cjs
make test
```

The JavaScript checks cover planner arithmetic and goal boundaries, exact split conservation and overpayment rejection, card statement/payment rules, and forecast/calendar boundaries, including future-dated expenses. The latest C run passed 42 core assertions and 27 isolated terminal smoke checks. The browser workflow has also been checked for planner totals, shared bills, and persistence after reload. These checks do not establish production financial or security certification.

For C-focused viva preparation, see [docs/viva_preparation.md](docs/viva_preparation.md). For the complete current system, start with the [project report](docs/project_report.md) and [demo guide](docs/demo_guide.md).

## Current limits and future work

The application depends on complete manual entries. Its forecast can be distorted by missing records or one-off purchases; the spending scenario only covers the two named categories. Bills are individual reminders without automatic recurring generation. There is one savings goal, equal splits include every group member, group membership stays fixed, and shared history has no per-entry edit/delete interface. Multi-tab concurrent editing is not coordinated.

Possible next steps include a portable unified backup, recurring bill schedules, configurable split participants/weights, multiple savings goals, a tested accessible mobile experience, and an authenticated backend with a carefully designed synchronization model.
