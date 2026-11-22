# CSET333 Project Viva Preparation

## 1. Project explanation — simple English

The **Student Expense & Budget Tracker** is a menu-driven C11 terminal program for recording student expenses and reviewing spending. A transaction stores an ID, date, category, description, amount, and payment method. The program can search, update, delete, sort, and filter those transactions. It also stores budgets by month and year, calculates monthly spending and remaining budget, and displays an alert when the budget is close to or over its limit. It keeps expenses, budgets, and custom category names in local binary files and can write a human-readable monthly report to a text file.

The source is split into modules so input validation, date handling, storage, expense operations, budgets, reports, and terminal presentation each have a clear place. Structures group related values, enums identify categories and payment methods, and the `PaymentDetails` union stores one payment-specific value selected by a `PaymentType` tag.

## 2. Project explanation — Hinglish

**Student Expense & Budget Tracker** ek C11 terminal application hai jisme student apne daily kharche record kar sakta hai. Har transaction mein ID, date, category, description, amount aur payment method hota hai. Program records ko search, update, delete, sort aur filter kar sakta hai. Har month aur year ke liye budget set hota hai; program us period ka kharcha, remaining budget aur utilization calculate karta hai. Budget limit ke paas ya usse upar pahunchne par warning/alert dikhata hai.

Expenses, budgets aur custom category names local files mein save hote hain, isliye program dobara chalane par data load hota hai. Monthly report ko readable text file mein export kiya ja sakta hai. Code alag modules mein hai: validation, date utilities, storage, expense handling, budget, reports aur UI. `struct` related data ko group karta hai, `enum` category/payment ko naam deta hai, aur `PaymentDetails` union ek waqt mein selected payment method ki detail rakhta hai.

## 3. Problem statement

Students often spend money across food, transport, education, housing, communication, healthcare, and other categories without keeping a consistent record. Without those records, it is difficult to see spending patterns or compare a month’s spending with a planned budget. This project provides a local way to record those expenses and calculate useful summaries from them.

## 4. Objectives

1. Record expenses with a date, category, description, amount, and payment method.
2. Find transactions by ID, date, category, amount, payment method, or description text.
3. Update or delete a transaction after user confirmation.
4. Keep a budget for a chosen month and year.
5. Calculate period spending, remaining budget, and utilization safely.
6. Show dashboard totals and budget status using saved records.
7. Generate daily, monthly, yearly, category, payment, high/low, budget, and summary views.
8. Sort and filter a copy of the transaction list without changing saved order.
9. Save expenses, budgets, and custom category names locally.
10. Demonstrate C structures, enums, a tagged union, pointers, dynamic allocation, functions, input validation, and file handling.

## 5. Complete working flow

1. `main()` initializes `AppState` with `nextId = 1`, initializes terminal colors, and displays the welcome screen.
2. `ensureDataDirectories()` makes sure `data/` and `reports/` are available.
3. `loadAllData()` reads the versioned files, checks file headers and sizes, validates records and IDs, and loads arrays into memory. Missing files start as empty data. Invalid files cause startup to stop with an error.
4. The main menu dispatches the chosen number to dashboard, expense, budget, report, sort/filter, category, export, help, or about functions.
5. Add/update/delete operations change the in-memory state only after the relevant validation and confirmation steps. Successful changes are saved through temporary files and rename replacement. Failed saves roll back the in-memory change for expense and budget changes.
6. Search, dashboard, reports, and sorting read the loaded data. Sorting/filtering uses copies for display.
7. On exit or end-of-input, `appStateFree()` releases the allocated arrays.

```text
Start -> initialize AppState -> create folders -> load and validate files
      -> show menu -> perform selected operation -> save successful changes
      -> return to menu -> free arrays -> exit
```

## 6. Explanation of every module

| Module | Actual responsibility |
| --- | --- |
| `main.c` | Initializes the state and UI, loads data, displays the main menu, dispatches choices, and frees state on exit. |
| `common.h` | Single definition point for shared enums, `Expense`, `Transaction`, `Budget`, `AppState`, sizes, and limits. |
| `expense.c/.h` | Adds, lists, searches, updates, and deletes expenses; provides category lookup/allocation helpers; performs sorting/filtering; lists/adds custom categories. |
| `budget.c/.h` | Finds and saves monthly budgets, calculates monthly spending and remaining amounts, classifies budget utilization, and runs the budget submenu. |
| `reports.c/.h` | Produces daily, monthly, yearly, category, payment, high/low, budget, and financial summary reports; exports selected-month text reports. |
| `storage.c/.h` | Creates data folders; writes and loads the three versioned binary files; validates headers, counts, records, references, and IDs; uses temporary files when saving. |
| `validation.c/.h` | Reads bounded lines with `fgets`, converts integers with `strtol` and decimals with `strtod`, checks ranges/trailing characters, trims strings, and handles required/optional fields. |
| `date_utils.c/.h` | Defines `Date`; validates leap years; parses and compares `DD-MM-YYYY`; reads the current local date; formats dates. |
| `ui.c/.h` | Draws the welcome screen, menus, sections, dashboard, transaction detail/table views, and status messages. ANSI color is opt-in. |
| `Makefile` | Builds `expense_tracker`; provides `make`, `make run`, `make clean`, and `make test`. |
| `tests/` | `test_core.c` checks reusable logic and persistence; `smoke.sh` exercises isolated command-line flows. |
| `docs/` | Project synopsis, architecture, algorithms, test cases, earlier viva Q&A, and this preparation guide. |

## 7. Explanation of every structure

### `Expense`

```c
typedef struct {
    int id;
    char date[DATE_SIZE];
    ExpenseCategory category;
    char categoryLabel[CATEGORY_NAME_SIZE];
    char description[DESCRIPTION_SIZE];
    double amount;
} Expense;
```

This is the expense data itself. `category` is one of the predefined enum values. For a custom category, the code stores `OTHER` in `category` and the selected custom name in `categoryLabel`. `DATE_SIZE` is 15, `DESCRIPTION_SIZE` is 100, and `CATEGORY_NAME_SIZE` is 50.

### `Transaction`

```c
typedef struct {
    Expense expense;
    PaymentType paymentType;
    PaymentDetails paymentDetails;
} Transaction;
```

This wraps the expense with a payment-method enum tag and the corresponding union value. `paymentType` tells the program which union member is active.

### `Budget`

```c
typedef struct { int month, year; double budgetAmount; } Budget;
```

One budget is associated with a selected month and year. The amount is in rupees. Existing month/year pairs are updated rather than duplicated.

### `AppState`

`AppState` holds pointers, counts, and capacities for the transaction array, budget array, and custom category array, plus `nextId`. The arrays grow dynamically via checked `realloc` calls and are released by `appStateFree()`.

### `Date`

`Date` is defined in `date_utils.h` with integer `day`, `month`, and `year` fields. It is a parsed working representation; transaction dates are stored as strings in `DD-MM-YYYY` format.

### Private storage header

`storage.c` defines a private `FileHeader` containing an eight-byte magic value, a version, and a record count. It is not an application transaction structure; it identifies and bounds each binary file before records are read.

## 8. Union explanation with an example

The code defines:

```c
typedef union {
    char upiId[PAYMENT_DETAIL_SIZE];
    char cardLastFourDigits[5];
    char cashNote[PAYMENT_DETAIL_SIZE];
} PaymentDetails;
```

`Transaction.paymentType` is the tag:

```c
if (t.paymentType == UPI) {
    /* t.paymentDetails.upiId is the active value */
} else if (t.paymentType == CARD) {
    /* t.paymentDetails.cardLastFourDigits is the active value */
} else {
    /* t.paymentDetails.cashNote is the active value */
}
```

In actual input handling, `choosePayment()` sets the enum and clears the union with `memset()` before reading the selected detail. A UPI user may leave the UPI ID blank; a card user enters only four digits; cash may have an optional note. The program does not ask for or store a PIN, CVV, or complete card number. Reports display the method, not the stored payment detail.

A structure reserves space for all members. A union overlays its members, so its size is enough for its largest member (here, 50 bytes, subject to C alignment rules). The union cannot identify its own active value; the separate `PaymentType` tag supplies that information.

## 9. Important functions and what they do

### Application and expense functions

- `main()` — starts and ends the application and routes main-menu selections.
- `addExpense(AppState *)` — finds an unused ID, collects and validates values, previews the transaction, asks to save, appends it, saves, and rolls back the count if saving fails.
- `viewExpenses(const AppState *)` — displays transaction pages of ten rows and reports page/lifetime totals.
- `searchExpenses(const AppState *)` — performs repeated searches using linear scans. Description matching is case-insensitive and allows a partial substring.
- `findExpenseById(const AppState *, int)` — linearly returns an array index or `-1`.
- `updateExpense(AppState *)` — copies the current record into `old` and `next`, edits `next`, preserves the ID, asks for confirmation, then restores `old` if saving fails.
- `deleteExpense(AppState *)` — confirms, shifts later records left, saves the shorter collection, and restores the record if the save fails.
- `sortAndFilterExpenses(const AppState *)` — copies records for viewing. Bubble sort handles amount/date/category/ID ordering; filters show matching copies without editing permanent records.
- `manageCategories(AppState *)` — lists categories and totals, or adds a non-duplicate custom category and persists it.
- `reserveTransactions()`, `reserveBudgets()`, `reserveCategories()` — grow arrays with `realloc`, check allocation, and maintain capacity fields.
- `categoryIndexForTransaction()` — puts custom `OTHER`-tagged transactions into their own report/dashboard bucket when their label matches a saved custom category.

### Budget and report functions

- `findBudget()` — finds a budget matching month and year.
- `calculateMonthlyExpenses()` — parses each stored date and sums only matching month/year transactions.
- `calculateRemainingBudget()` — returns budget minus selected-month spend; returns zero if no budget exists. The UI separately communicates that the budget is not configured.
- `budgetStatus()` — returns healthy, normal, approaching-limit warning, or exceeded text at the 50%, 80%, and 100% thresholds.
- `setMonthlyBudget()` — reads a month/year and amount, adds or replaces the pair, saves it, and rolls back on a failed save.
- `reportsMenu()` — dispatches report choices.
- `exportMonthlyReport()` — validates the selected month/year, writes a dated monthly text report with transactions and calculated totals, and reports its path.

### Date, validation, and storage functions

- `readLine()` — uses `fgets` with a buffer length and drains overlong input rather than silently keeping a truncated value.
- `readInt()` / `readDouble()` — use `strtol` / `strtod`; reject range errors, invalid suffixes, and out-of-range values.
- `parseDate()` — requires ten characters in `DD-MM-YYYY`, checks separators/digits, month lengths, and leap years.
- `compareDates()` — compares year, then month, then day.
- `currentDate()` — gets local system time with `time()` and `localtime()`.
- `loadAllData()` — validates and loads the three persistent files; records are not blindly trusted.
- `saveExpenses()` / `saveBudgets()` / `saveCategories()` — write versioned headers and corresponding record arrays using a temporary file and rename replacement.
- `uiInitialize()` — enables ANSI only when `EXPENSE_TRACKER_COLOR=1`, unless `NO_COLOR` exists or `TERM=dumb`.

## 10. File handling explanation

The application works relative to its current directory:

| File | Content |
| --- | --- |
| `data/expenses.dat` | Magic `SEXPDATA`, version 1, count, then `Transaction` records |
| `data/budgets.dat` | Magic `SBUDGETS`, version 1, count, then `Budget` records |
| `data/categories.dat` | Magic `SCATEGS1`, version 1, count, then fixed-size custom category names |
| `reports/monthly_report_YYYY_MM.txt` | Readable monthly report export |

At startup, storage checks the magic, version, maximum count, expected file size, and record values before using them. It validates dates, enum ranges, amounts, payment-tag-specific union content, unique expense IDs, budgets, and custom category references. Missing files are treated as empty collections. A corrupt or unsupported file prevents startup rather than being silently accepted.

Saving writes a sibling `.tmp` file, checks write/close results, then renames it. The Windows path uses a backup rename because replacing an existing file with `rename()` is not uniform across systems. The files store C structures directly, so they are intended for compatible compiler/architecture builds, not general interchange between arbitrary systems. Reports are text for human reading.

## 11. Forty viva questions and answers

1. **What is the title of your project?** Student Expense and Budget Management System Using C, implemented as the Student Expense & Budget Tracker.
2. **What problem does it address?** Students may not keep a usable record of daily purchases, so they cannot easily compare monthly spending with a budget.
3. **What language and standard does it use?** C11. The Makefile compiles with GCC and `-std=c11`.
4. **What kind of application is it?** A menu-driven, offline terminal application.
5. **What does one expense record contain?** ID, date, category enum, optional custom category label, description, and amount.
6. **What does `Transaction` add to an `Expense`?** A `PaymentType` tag and its `PaymentDetails` union.
7. **Why is the category represented by an enum?** It gives the nine predefined choices named constants and allows range validation when reading stored data.
8. **Which payment methods are implemented?** Cash, UPI, and card.
9. **What is the purpose of the payment union?** It stores one relevant optional detail for the selected payment method while sharing storage between those alternatives.
10. **How does the program know which union field to read?** It checks `Transaction.paymentType` before using the corresponding member.
11. **What card information can the program store?** Only the last four digits; it does not request a complete number, CVV, or PIN.
12. **How are custom categories represented in an expense?** The enum is `OTHER`; `categoryLabel` stores the custom name.
13. **What does `AppState` manage?** Dynamic arrays of transactions, budgets, and custom category names, their counts/capacities, and the next ID.
14. **How are IDs generated?** `unusedId()` tries the current candidate and checks existing transaction IDs until it finds a free positive value.
15. **How is a monthly total calculated?** Each transaction date is parsed; its amount is included only when month and year match.
16. **How is remaining budget calculated?** Monthly budget minus matching month/year spending.
17. **What are the budget alert thresholds?** Below 50% healthy; 50% to below 80% normal; 80% to below 100% warning; 100% or above exceeded.
18. **What happens if a budget is zero?** The dashboard and budget summary avoid division by zero and show utilization as unavailable. The monthly report uses `0.00%` as its zero-budget placeholder and labels the status “Zero budget.”
19. **What happens if no budget exists?** The calculation helper returns zero for remaining amount, while the UI reports that no budget is configured.
20. **How does date validation work?** It checks exact string length/positions, digits, month/day ranges, and leap-year February length.
21. **What leap-year rule is used?** A year divisible by four is leap, except a century year must also be divisible by 400.
22. **How does the project compare dates?** It compares parsed year, then month, then day values.
23. **How is current date obtained?** `time()` and `localtime()` provide the machine’s local calendar date.
24. **How are menu numbers read?** `readLine()` collects a bounded string; `readInt()` parses it with `strtol` and checks range and trailing text.
25. **How are amounts read?** `readDouble()` uses `strtod`, rejects errors/non-finite values/trailing characters, and checks the allowed range.
26. **How does description search work?** It linearly scans transaction descriptions for a case-insensitive partial substring.
27. **How are other searches performed?** The program linearly checks ID, exact date, selected category name, exact amount, or payment enum as chosen.
28. **Which sorting algorithm is used?** Bubble sort, operating on a copied transaction array.
29. **Why does sorting not change saved order?** The source array is copied with `memcpy`; sorting/filtering display uses the copy.
30. **What is bubble sort’s time complexity here?** O(n²) in the number of transactions.
31. **Which reports are offered?** Daily, monthly, yearly, category-wise, payment method, highest, lowest, monthly budget, and complete summary.
32. **What does monthly export contain?** Generation date, month/year, totals, category/payment totals, budget information, and transactions for that selected month.
33. **Where does the program store data?** In `data/expenses.dat`, `data/budgets.dat`, and `data/categories.dat` under the working directory.
34. **Why does each binary file have a header?** A magic value, version, and count help identify the format and reject unreasonable or mismatched files.
35. **What does the application do when an expense file is missing?** It starts with an empty expense history.
36. **What does it do with a corrupt file?** It reports an error and stops loading rather than treating the contents as valid.
37. **How does saving reduce the chance of losing the old file?** It writes a complete temporary file, checks it, and renames it after writing succeeds.
38. **What is a limitation of the binary format?** It writes C structures directly, so layout and numeric representation are compiler/architecture dependent.
39. **How does an update protect the original value?** It keeps `old` and `next` transaction copies and restores `old` if saving the edit fails.
40. **How does the program free memory?** `appStateFree()` frees all dynamic arrays before normal or error exit after loading.

## 12. Fifteen tricky questions: structures, unions, and pointers

1. **If two structure variables are assigned with `b = a`, are all fields copied?** Yes, structure assignment copies the value of each member as one structure value. Padding bytes are not a portable application-level field and should not be relied on.
2. **Can a structure contain another structure?** Yes. `Transaction` contains an `Expense` member named `expense`.
3. **Does `sizeof(Expense)` necessarily equal the sum of its fields?** No. The compiler may insert padding for alignment.
4. **Does `sizeof(PaymentDetails)` equal the sum of its three array members?** No. A union overlays the members; its size is at least that of its largest member, possibly rounded for alignment.
5. **Can the union tell which member is active?** No. The separate `paymentType` enum is the tag.
6. **What bug happens if code reads `upiId` when the tag says `CARD`?** It interprets the same union storage as the wrong member, producing meaningless data and violating the tagged-union convention.
7. **Why does `choosePayment()` call `memset()` on the union?** To clear old payment-specific bytes before collecting the newly selected member. It does not make the union self-describing; `paymentType` still controls interpretation.
8. **Can both a UPI ID and card digits be kept simultaneously in this union?** No. They share storage. Supporting both at once would require separate structure fields or another data design.
9. **Does `PaymentType` automatically enforce the union tag at compile time?** No. C does not bind the enum to the union; program logic and record validation keep them consistent.
10. **What does `Transaction *p` mean?** `p` stores the address of a `Transaction`; `p->expense` is shorthand for `(*p).expense`.
11. **What is the difference between `const AppState *` and `AppState *` in these functions?** The former promises that the function will not modify the state through that pointer; the latter permits modification.
12. **Why is a pointer-to-array used for `customCategories`?** `char (*customCategories)[CATEGORY_NAME_SIZE]` points to fixed-width category-name arrays, so indexing selects a whole 50-byte row.
13. **Why assign `realloc()` to a temporary pointer first?** If it fails, it returns `NULL`; keeping the result in a temporary preserves the original pointer so it is not lost.
14. **What can go wrong if a pointer is used after `free()`?** It becomes a dangling pointer; dereferencing it is undefined behavior. `appStateFree()` also zeros the state after freeing it to reduce accidental reuse.
15. **Why does `findExpenseById()` return an `int` index instead of a pointer?** It returns the array position or `-1` for not found. The transaction limit (100,000) fits in `int` on the supported GCC targets; callers use the index to access the current array.

## 13. Possible live-coding modifications

These are examiner-style extension ideas. **They are not currently implemented features.** A safe answer should identify which structures, menus, validation, storage version, and tests would need changes.

1. **Add a new predefined category.** Add an enum value before `CATEGORY_COUNT`, update `CATEGORY_NAMES`, ensure category-selection/range validation sees it, then add a test for listing and reporting it. Existing binary files store enum numbers, so changing enum order is unsafe; append new values or version/migrate the file format.
2. **Add a new payment option such as Wallet.** Add `WALLET` to `PaymentType`, add its union member if it needs a detail, implement input in `choosePayment()`, update display names, and validate the tag/active member in `storage.c`.
3. **Add an optional note to every transaction.** Add a bounded string to `Expense`, read it through `readOptionalString()`, show it in details, validate it while loading, and bump/migrate the binary file format because the record layout changes.
4. **Add a date-range report.** Read and validate start/end dates, reject start-after-end with `compareDates()`, then scan records and include dates between the bounds. Test inclusive boundary dates.
5. **Add CSV export.** Create a separate export routine using text mode, quote/escape commas and quotes, check every write/close, and use a safe generated filename. This project currently exports monthly reports as plain text, not CSV.
6. **Make category sorting case-insensitive.** Change the category comparator used by `cmpTx()`, test mixed-case names, and keep sorting on the copy.
7. **Add a transaction count limit setting.** It would affect `MAX_RECORDS`, storage header validation, allocation limits, and tests; make sure multiplication/count checks remain safe.
8. **Add budget warning preference (for example 75%).** Store the setting or pass it into the status calculation, validate a sensible range, and update the current hard-coded thresholds only if the teacher asks to change business rules.
9. **Add a category archive/delete option.** Before removing a category, scan transactions for its custom label. Either block deletion while referenced or preserve the old name so existing transactions remain understandable. The current program only lists/adds custom categories.
10. **Add transaction pagination choice.** Ask for a page size within a range and use it instead of the current fixed page size of ten; keep bounds and avoid division-by-zero in page calculations.

### Viva tip

When explaining any proposed modification, first state the affected data structure, then the input/display path, then validation and storage compatibility, and finally the test you would add. For this code, a persisted structure change needs special care because the binary records contain raw C structures.
