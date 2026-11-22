# Student Expense and Budget Management System Using C

**Course:** CSET333 – C Programming · **Level:** Intermediate · **Language:** C11 · **Currency:** Indian Rupees (Rs.)

## Introduction and problem statement

Students make frequent purchases for food, transportation, education, housing, communication, health, and leisure. Without a record of those purchases, it is difficult to understand spending or stay within a monthly limit. This menu-driven terminal application records transactions, maintains monthly budgets, and calculates spending summaries from saved records.

## Objectives, scope, and features

- Add, list, search, update, and delete expense transactions.
- Track predefined and persistent custom categories.
- Set budgets by month and year; calculate monthly spending, remaining amount, utilization, and alerts.
- Produce daily, monthly, yearly, category, payment, highest/lowest, budget, and summary reports.
- Sort and filter a copied transaction list without changing saved order.
- Export a monthly report to a text file.
- Save local data in versioned binary files and reload it after restart.

The program is an offline, single-user learning project. It is not a bank connection or accounting system.

## Requirements and technologies

- GCC with C11 support; `make` (GNU Make or compatible).
- macOS or Windows with a GCC toolchain such as MinGW. The source uses standard C libraries; directory creation and replacement of existing files are isolated behind small platform conditionals.
- Hardware: a standard desktop/laptop that can run GCC, with a keyboard, terminal, and enough memory for the selected transaction history. Disk space is needed for the executable, local binary files, and text reports.
- A terminal and permission to create `data/` and `reports/` in the working directory.

No external libraries, database, network API, or service is used.

## Build and run

```sh
make
make run
```

To run the automated checks in isolated temporary directories:

```sh
make test
```

## Terminal appearance

The interface uses plain text by default, so it works in terminals that do not support ANSI colors. To opt into color, set `EXPENSE_TRACKER_COLOR=1` before running. `NO_COLOR` or `TERM=dumb` disables ANSI sequences. Section frames, dashboard labels, aligned expense tables, and status messages remain readable without color.

Remove the executable and object files with `make clean`. The application creates `data/` and `reports/` if needed. Back up those folders before moving the project. The binary record layout is versioned and validated, but like most direct `fwrite` of C structures it is intended for the same compiler/architecture build, not as a portable interchange format.

## C concepts demonstrated

- **Structures:** `Expense`, `Transaction`, `Budget`, and `AppState` group related information.
- **Enumerations:** `ExpenseCategory` and `PaymentType` give category and payment tags readable names.
- **Union:** `PaymentDetails` stores one optional payment-specific value. `paymentType` selects the active member; card data is limited to its last four digits.
- **Arrays, strings, pointers:** fixed-size fields bound user strings; pointers access dynamically allocated collections and const-qualified views.
- **Dynamic memory:** arrays grow with checked `realloc` calls up to documented limits.
- **Functions and modules:** each `.c` file owns a focused part of the system, with declarations in guarded headers.
- **File handling:** version headers, checked reads and writes, temporary files, and rename replacement preserve local records.
- **Validation:** `fgets`, `strtol`, and `strtod` are used instead of unsafe input; dates include calendar and leap-year validation.

## Architecture and file descriptions

| File | Responsibility |
| --- | --- |
| `main.c` | Initialize/load state, show menu, dispatch actions, free memory |
| `common.h` | Shared enums, structures, limits, and state declarations |
| `expense.c/.h` | Expense CRUD, search, sorting/filtering, categories |
| `budget.c/.h` | Budget storage and monthly calculations/alerts |
| `reports.c/.h` | Calculated reports and monthly text export |
| `storage.c/.h` | Versioned binary file loading and atomic replacement |
| `validation.c/.h` | Bounded line input and numeric/string validation |
| `date_utils.c/.h` | Date parsing, leap years, comparison, current date |
| `ui.c/.h` | Menus, dashboard, and formatted transaction output |
| `Makefile` | Build, run, clean, and test commands |
| `tests/` | Core assertions and isolated menu-level smoke checks |
| `docs/` | Synopsis, architecture, algorithms, viva notes, test record |

The source-based viva guide, with English/Hinglish explanations, structure/union notes, 40 Q&A, 15 tricky questions, and live-coding ideas, is in [docs/viva_preparation.md](docs/viva_preparation.md).

The submission-style college project report, including a certificate template and sample output captured from the application, is in [docs/project_report.md](docs/project_report.md).

## Data structures and union behavior

An `Expense` holds ID, date, category enum, optional custom category label, description, and amount. A `Transaction` combines that expense with a `PaymentType` tag and `PaymentDetails` union. The union uses space for only the active member: UPI ID, four card digits, or a cash note. The code clears the union before selecting a new payment type and only reads the member associated with the tag. It never asks for a PIN, CVV, password, or full card number. A structure allocates space for all members; a union overlays its members and needs a separate tag to say which value is active.

`AppState` owns resizable arrays for transactions, budgets, and custom categories. Limits are 100,000 transactions, 2,400 month budgets, and 64 custom categories. The expense ID is generated from a positive unused integer.

## Storage and file handling

- `data/expenses.dat`: magic `SEXPDATA`, format version, count, then transaction records.
- `data/budgets.dat`: magic `SBUDGETS`, format version, count, then monthly budgets.
- `data/categories.dat`: magic `SCATEGS1`, format version, count, then fixed-size custom category names.

Load checks magic, version, count limit, exact file size, record strings, enum values, dates, amounts, IDs, and tagged payment details before accepting records. Missing files mean an empty collection. A malformed or unsupported file stops startup with an error instead of silently discarding data. Writes go to a sibling `.tmp` file, check write and close results, and rename only after the complete new file is ready. Binary files are compact and straightforward for demonstrating `fread`/`fwrite`; text exports are readable and easier to share. Direct binary structures are compiler/architecture dependent, unlike a carefully specified text interchange format.

## Algorithms and reports

Expense lookup scans the transaction array by ID. Monthly totals scan dates and include only matching month/year. Date comparison parses year, month, and day components. Sorting uses bubble sort on an allocated copy, so it does not change the application state or saved file. Bubble sort has O(n²) time and O(n) additional memory here; ID lookup and report aggregation are O(n). Details and pseudocode are in [docs/algorithms.md](docs/algorithms.md).

## Screenshots guidance

For a project presentation, capture the welcome/menu screen, a populated dashboard, a page of transaction rows, one monthly report, and the export text file. Use a terminal window wide enough to display the transaction table.

## Test results

`make test` was run during review: **42 core checks passed** and **27 isolated CLI smoke checks passed**. The checks cover date parsing, budget thresholds/calculations, tagged-union and custom-category persistence, duplicate IDs, expense CRUD/search, sorting, reports/export, restart persistence, missing/corrupt files, long input, zero budgets, invalid values, and plain/ANSI terminal output. The suite also passed with AddressSanitizer and UndefinedBehaviorSanitizer enabled. See [docs/test_cases.md](docs/test_cases.md) for recorded outcomes.

## Limitations and future enhancements

- This is a local, single-user application with compiler-specific binary persistence; it has no encryption or multi-user access control.
- Payment identifiers are not required for reporting and should be omitted when not useful.
- Reporting and sorting operate in memory; bubble sort is intended for an educational dataset.
- Future work could add CSV import/export, configurable currency, category rename/archive, date-range reports, and a portable field-by-field storage format.

## Conclusion

The project demonstrates an end-to-end C program with validated input, modular design, tagged unions, dynamic memory, persistent records, budget calculations, and reports. Its stored values are local and designed for demonstration and learning.
