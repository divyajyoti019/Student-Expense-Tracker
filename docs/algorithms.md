# Algorithms and Pseudocode

## Adding a transaction

```text
Find the next positive ID that is not already present
Read date, category, description, positive amount, and payment type
Validate the date and all required values
Zero payment union, then read only the field for the selected payment tag
Display the proposed transaction
If user confirms:
    append to the in-memory array
    write a complete versioned temporary file
    rename it over the stored file
    if saving fails, remove the appended in-memory record
```

## Updating and deleting

Update copies the original transaction, collects edits into a second value, preserves its ID, and asks for confirmation. Only after confirmation does it replace the array element and save; on save failure the original value is restored. Delete asks for confirmation, shifts later records left, saves the rewritten file, and restores the removed record and array order if the save fails.

## Monthly budget calculation

```text
total = 0
for each transaction:
    parse transaction date
    if transaction month/year equal selected month/year:
        total += amount
remaining = budget - total
utilization = budget > 0 ? total / budget * 100 : unavailable
```

Utilization status is healthy below 50%, normal from 50% to below 80%, warning from 80% to below 100%, and exceeded at 100% or more.

## Date validation and comparison

The date parser requires exactly ten characters in `DD-MM-YYYY` form, checks each digit and both hyphens, validates month/day ranges, and calculates February’s maximum using the Gregorian leap-year rule: divisible by 4, except centuries unless divisible by 400. Comparison checks year, then month, then day.

## Search

Search scans the transaction array once. ID/date/category/amount/payment searches compare their selected field. Description search checks each possible substring position while comparing letters case-insensitively. A second array of matching indices is used for display; source records remain unchanged. A linear search takes O(n) comparisons.

## Sorting

The selected sort makes a copy of the transaction array. Bubble sort compares adjacent records and swaps them when they are in the wrong order. Date sorts parse the dates and compare year/month/day values. The nested passes take O(n²) time; the copy uses O(n) extra memory. This is easy to trace in an introductory programming course but is not the best choice for very large histories.

## Loading and saving

Before reading, storage checks the header magic/version, maximum record count, and exact file length. Every record is validated before being accepted. Saving writes a new header and all records to a temporary file, checks `fwrite` and `fclose`, then renames it to the final path. A failed write removes the temporary file and leaves the previous file in place.
