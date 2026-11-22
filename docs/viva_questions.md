# Viva Questions and Answers

1. **What is C?** C is a compiled, procedural programming language. This application is compiled with GCC using the C11 standard.
2. **What is a structure?** A structure combines related fields under one type. `Expense` groups the ID, date, category, description, and amount.
3. **What is a union?** A union overlays its members in shared storage. `PaymentDetails` stores one payment-specific value at a time.
4. **How does a union differ from a structure?** A structure allocates storage for all members; a union shares the same storage among its members.
5. **Why use a union here?** Cash note, UPI ID, and card last-four digits are mutually exclusive details, so one tagged union represents the currently selected method.
6. **How is the active union member known?** The separate `PaymentType` enum is the tag. Code switches on it before reading a union member.
7. **What is an enum?** An enum gives integer constants readable names. The project uses `ExpenseCategory` and `PaymentType`.
8. **What is a pointer?** A pointer stores an address. Module functions receive an `AppState *` when they need to update the shared collections.
9. **What is an array?** An array stores a sequence of same-type elements. Fixed-size arrays hold date and description strings; dynamic arrays hold transactions.
10. **What is dynamic memory allocation?** It obtains memory while a program runs. Transaction, budget, and category arrays grow with checked `realloc` calls.
11. **How is memory freed?** `appStateFree` releases all three owned arrays during program exit.
12. **What is a function?** A function is a named unit of work. For example, `calculateMonthlyExpenses` sums records for one month.
13. **What is modular programming?** It splits a program into focused source/header modules. Expense, budget, storage, reports, validation, dates, and UI each have separate responsibilities.
14. **What is a header file for?** It declares shared types and function interfaces so multiple source files can use them consistently. Headers have include guards.
15. **What is a Makefile?** It contains build rules. This project provides `make`, `make run`, `make clean`, and `make test`.
16. **What is file handling?** File handling reads and writes data on storage. The application uses standard C functions such as `fopen`, `fread`, `fwrite`, `fclose`, `remove`, and `rename`.
17. **What is the difference between text and binary files?** Text stores readable characters; binary stores byte values. Transaction data is binary, while exported reports are text.
18. **What do `fread` and `fwrite` do?** `fread` reads blocks of bytes into memory; `fwrite` writes blocks from memory to a file.
19. **What is the file header used for?** Each data file starts with an eight-byte magic value, version, and count so storage can detect the wrong format and reject unreasonable counts.
20. **What happens if an expense file is missing?** It is treated as an empty expense history and the application can start normally.
21. **What happens if a data file is corrupt?** Header, size, and record checks fail; startup reports an error rather than silently treating the data as valid.
22. **How is data preserved after exit?** Successful modifications rewrite the relevant binary file; on the next run `loadAllData` reads it back.
23. **How is date validation performed?** The parser checks the exact `DD-MM-YYYY` shape, numeric positions, month/day bounds, and leap-year February length.
24. **What is a leap year in this program?** It is divisible by 4, except a century year must also be divisible by 400.
25. **How is a unique expense ID generated?** `unusedId` starts from `nextId`, checks existing records, and wraps to 1 at the maximum integer if needed.
26. **How is monthly spending calculated?** The program parses each record date and adds its amount only when its month and year match the selected period.
27. **How is budget utilization calculated?** Monthly spending divided by the selected monthly budget, multiplied by 100. A zero or missing budget is handled without division.
28. **What do the budget alerts mean?** Under 50% is healthy, 50–under 80% is normal, 80–under 100% warns, and 100% or more is exceeded.
29. **How does description search work?** It scans each description for the requested substring, comparing letters case-insensitively.
30. **What sorting algorithm is used?** Bubble sort, applied to a copied list so the stored transaction order remains unchanged.
31. **What is the time complexity of this bubble sort?** O(n²) in the number of records because of its nested passes.
32. **How are dates sorted?** The date strings are parsed, then year, month, and day fields are compared in order.
33. **Why use `fgets` for input?** It bounds the number of characters read into a buffer and avoids unbounded input.
34. **How are integers and decimal amounts converted?** `strtol` and `strtod` parse the line, and the code rejects range errors, trailing characters, and non-finite amounts.
35. **How is an update protected from a failed save?** The original transaction is copied before editing and restored if the updated file cannot be written.
36. **How does delete confirmation work?** The transaction is displayed, the user must answer yes, and the saved file is rewritten. A cancelled delete leaves the record in place.
37. **Why are card details limited?** The program only asks for the final four digits and never requests or stores a complete card number, CVV, or PIN.
38. **What is a temporary file used for?** A new complete file is written first; only a successful write is renamed over the old file, reducing the chance of losing the previous version.
39. **What data does `AppState` own?** Dynamically allocated transactions, monthly budgets, custom category strings, their counts/capacities, and the next ID.
40. **What are limitations of this binary storage?** It writes C structures directly, so padding and number representation make the files suitable for compatible builds rather than universal interchange.
