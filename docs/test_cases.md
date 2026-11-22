# Test Cases and Recorded Results

The results below were recorded from `make test` in this workspace. It ran a 42-check C core suite and 27 menu-level smoke checks in temporary directories. All listed checks passed, both with the normal warning build and with AddressSanitizer/UndefinedBehaviorSanitizer enabled. Smoke tests do not touch a user's pre-existing data because they run in a fresh temporary directory.

| ID | Input / condition | Expected result | Actual result |
| --- | --- | --- | --- |
| T01 | Leap year 2024 | True | PASS |
| T02 | Century year 1900 | False | PASS |
| T03 | Century year 2000 | True | PASS |
| T04 | Parse `29-02-2024` | Accepted | PASS |
| T05 | Parse `29-02-2023` | Rejected | PASS |
| T06 | Parse month 13 | Rejected | PASS |
| T07 | Parse 31 April | Rejected | PASS |
| T08 | Parse date missing leading zero | Rejected | PASS |
| T09 | Parse nonnumeric date | Rejected | PASS |
| T10 | Compare 31-12-2025 with 01-01-2026 | Earlier date sorts first | PASS |
| T11 | Compare dates in different months | Month fields determine order | PASS |
| T12 | Compare dates in same month | Day fields determine order | PASS |
| T13 | Resolve predefined Food category | `FOOD` returned | PASS |
| T14 | Resolve unknown predefined category | Not found | PASS |
| T15 | Reserve transaction capacity | Allocation succeeds | PASS |
| T16 | Find existing transaction ID 8 | Correct array index returned | PASS |
| T17 | Find missing ID 99 | `-1` returned | PASS |
| T18 | Calculate November 2026 spending | Rs. 300.00 from fixture records | PASS |
| T19 | Calculate October 2026 spending | Rs. 0.00 | PASS |
| T20 | Remaining amount without budget | Safe zero result | PASS |
| T21 | Utilization 49.99% | Healthy status | PASS |
| T22 | Utilization 50% | Normal status | PASS |
| T23 | Utilization 79.99% | Normal status | PASS |
| T24 | Utilization 80% | Warning status | PASS |
| T25 | Utilization 100% | Exceeded status | PASS |
| T26 | Create storage directories | `data/` and `reports/` exist | PASS |
| T27 | Reserve budget capacity | Allocation succeeds | PASS |
| T28 | Rs. 500 budget and Rs. 300 spend | Rs. 200 remaining | PASS |
| T29 | Save transaction fixtures | Versioned expense file written | PASS |
| T30 | Save budget fixture | Versioned budget file written | PASS |
| T31 | Reload saved records | Load succeeds | PASS |
| T32 | Verify loaded record count | Two records | PASS |
| T33 | Verify persisted UPI data | UPI tag and ID restored | PASS |
| T34 | Verify persisted card details | Card tag and last four restored | PASS |
| T35 | Verify persisted budget | Month, year, amount restored | PASS |
| T36 | Add valid cash, UPI, and card expenses | Confirmed records saved | PASS |
| T37 | Enter negative expense amount | Amount rejected | PASS |
| T38 | Enter impossible calendar date | Date rejected and reprompted | PASS |
| T39 | Set budget below monthly spending | Exceeded alert displayed | PASS |
| T40 | Update expense and confirm | Same ID, changed amount saved | PASS |
| T41 | Search by ID and partial description | Matching rows shown | PASS |
| T42 | Cancel delete, then confirm delete | Cancel preserves; yes removes | PASS |
| T43 | Sort amounts and dates | Sorted copy displayed | PASS |
| T44 | Generate monthly report | Selected period totals displayed | PASS |
| T45 | Export monthly report | Non-empty text report created | PASS |
| T46 | Restart and list remaining records | Saved records reload | PASS |
| T47 | Start without any data file | Empty history starts successfully | PASS |
| T48 | Corrupt expense magic bytes | Startup rejects file | PASS |
| T49 | Enter invalid menu text | Conversion rejected | PASS |
| T50 | Enter zero amount | Rejected | PASS |
| T51 | Add a custom category | Category saved without colliding with built-ins | PASS |
| T52 | Cancel an expense update | Original transaction remains unchanged | PASS |
| T53 | Search for absent ID 999 | Not-found message displayed | PASS |
| T54 | Enter 110-character description | Overflow detected; user can re-enter a shorter value | PASS |
| T55 | Restart after custom category transaction | Custom category label is displayed from saved data | PASS |
| T56 | Ask whether year 0 is a leap year | False | PASS |
| T57 | Allocate custom category storage | Capacity is reserved | PASS |
| T58 | Map a custom expense category | It gets a distinct category report bucket | PASS |
| T59 | Save custom categories file | Versioned category file is written | PASS |
| T60 | Reload transaction and custom category | Custom label matches saved category | PASS |
| T61 | Write transaction file with duplicate IDs | Fixture writes; loader performs integrity check | PASS |
| T62 | Load duplicate-ID transaction file | File is rejected | PASS |
| T63 | Set a zero monthly budget and view dashboard | Shows zero-budget status; avoids division by zero | PASS |
| T64 | Launch the application | Branded welcome screen appears | PASS |
| T65 | Open dashboard | Finance summary uses aligned labeled metrics | PASS |
| T66 | View expenses | Fixed-width table headings align | PASS |
| T67 | Set `EXPENSE_TRACKER_COLOR=1` in an ANSI terminal | ANSI styling is emitted | PASS |
| T68 | Set `NO_COLOR` with color enabled | Output remains plain text | PASS |

## Test execution

Command: `make test`  
Core checks: **42 passed, 0 failed**  
CLI smoke checks: **27 passed**
