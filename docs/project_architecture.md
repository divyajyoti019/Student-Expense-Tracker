# Project Architecture

## Module flow

```text
main.c
  ├── ui.c             menus, dashboard, table formatting
  ├── expense.c        CRUD, search, sorting/filtering, categories
  ├── budget.c         monthly budgets and budget calculations
  ├── reports.c        summaries and text export
  └── storage.c        validated binary load and atomic save

Shared services: common.h · validation.c · date_utils.c
Persistent files: data/expenses.dat · data/budgets.dat · data/categories.dat
Exports: reports/monthly_report_YYYY_MM.txt
```

## Ownership and interfaces

`main.c` owns one `AppState` for the lifetime of the process. It loads through `loadAllData`, dispatches to menu/module functions, and releases all arrays with `appStateFree`. The state owns three dynamically allocated arrays. Modules receive a pointer when they need to mutate state and a `const AppState *` for read-only calculations and displays.

`common.h` is the only definition point for `Expense`, `Transaction`, `Budget`, enums, constants, and `AppState`. Every public header uses an include guard. `validation.c` owns terminal input conversions; `date_utils.c` owns calendar parsing and comparison. `storage.c` owns file paths and file formats. It does not collect user input.

## Data model

- `ExpenseCategory` has nine predefined values plus `CATEGORY_COUNT` as an array bound. Custom labels use enum value `OTHER` and a non-empty `categoryLabel`.
- `PaymentType` is the tag for `PaymentDetails`. Code reads only `upiId`, `cardLastFourDigits`, or `cashNote` as selected by the tag.
- `Transaction` groups the expense with payment type and payment details.
- `Budget` uses `(month, year)` as its key.
- `AppState` tracks pointer/count/capacity for each collection and the next candidate ID.

## Storage format and failure handling

Each binary file begins with an eight-byte magic value, a version number, and a record count. Counts are checked against fixed application maxima and file size is compared with the expected header-plus-record size before records are read. Loaded values receive field validation, including tagged-union-specific checks. Writes serialize to a temporary sibling file, check writes and close, and then rename. If a save fails during an update/delete, the old in-memory record is restored. Missing files start empty; corrupt or unsupported files stop startup with a diagnostic.

`fwrite` of C structures is intentionally kept as an educational local binary format. Structure padding and numeric representation mean these files should be moved only between compatible builds. Use a field-by-field format or documented text encoding if portable interchange becomes a requirement.

## Build dependency

`make` compiles all modules with `-std=c11 -Wall -Wextra -Wpedantic`. `make test` builds a separate core-check executable and runs both core and shell-driven integration checks in temporary directories.
