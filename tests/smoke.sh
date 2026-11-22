#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
cp "$ROOT/expense_tracker" "$TMP/expense_tracker"
cd "$TMP"
check() { grep -q "$2" "$1" || { echo "FAIL: $3"; exit 1; }; echo "PASS: $3"; }

./expense_tracker > add.out 2>&1 <<'INPUT'
2
20-11-2026
1
Breakfast
120
1
Cafe
y

2
19-11-2026
2
Bus pass
80
2

y

2
18-11-2026
3
Textbook
400
3
1234
y

2
17-11-2026
4
Negative amount
-5

2
16-11-2026
1
Zero amount
0

10
2
Books

0
2
31-02-2026
20-02-2026
10
Other expense
10
1

y

0
INPUT
check add.out 'Expense saved successfully' 'valid expenses save with all three payment variants'
check add.out 'STUDENT EXPENSE & BUDGET TRACKER' 'welcome screen displays project branding'
test "$(grep -c 'Invalid amount' add.out)" -ge 2 && echo 'PASS: negative and zero amounts are rejected'
check add.out 'Invalid calendar date' 'invalid calendar day is rejected'
check add.out 'Custom category added' 'custom category is stored'

./expense_tracker > budget.out 2>&1 <<'INPUT'
7
1
11
2026
500

0
1

0
INPUT
check budget.out 'Alert: budget exceeded' '100% budget alert uses monthly spend'
check budget.out 'STUDENT FINANCE DASHBOARD' 'dashboard uses the redesigned summary layout'
./expense_tracker > zero-budget.out 2>&1 <<'INPUT'
7
1
11
2026
0

0
1

0
INPUT
check zero-budget.out 'Zero budget; utilization is unavailable' 'zero budget is distinguished from missing budget'

./expense_tracker > cancel-update.out 2>&1 <<'INPUT'
5
1

n

0
n
n

0
INPUT
check cancel-update.out 'Update cancelled' 'cancelled update preserves original transaction'

./expense_tracker > update.out 2>&1 <<'INPUT'
5
1

n

150
n
y

0
INPUT
check update.out 'Expense updated' 'update preserves ID and saves changed amount'

./expense_tracker > search.out 2>&1 <<'INPUT'
4
1
1
6
pass
0
0
INPUT
check search.out 'Matches: 1' 'ID and partial-description searches find records'
printf '4\n1\n999\n0\n0\n' | ./expense_tracker > no-match.out 2>&1
check no-match.out 'No matching expenses found' 'search reports an absent ID'

./expense_tracker > delete.out 2>&1 <<'INPUT'
6
2
n

6
2
y

0
INPUT
check delete.out 'Deletion cancelled' 'cancelled deletion preserves record'
check delete.out 'Expense deleted' 'confirmed deletion removes record'

./expense_tracker > sort.out 2>&1 <<'INPUT'
9
1
3
0
0
INPUT
check sort.out 'Records: 3' 'amount and date sorting display copied records'

./expense_tracker > report.out 2>&1 <<'INPUT'
8
2
11
2026

0
11
11
2026

0
INPUT
check report.out 'Monthly Expense Report' 'monthly report is generated'
test -s reports/monthly_report_2026_11.txt && echo 'PASS: report export writes a text file'
./expense_tracker > restart.out 2>&1 <<'INPUT'
3

0
INPUT
check restart.out 'Total records: 3' 'remaining records survive restart'
check restart.out 'DATE       | CATEGORY' 'expense table prints aligned column headings'
check restart.out 'Books' 'custom category labels survive restart'

mkdir missing && cp "$ROOT/expense_tracker" missing/ && (cd missing && printf '0\n' | ./expense_tracker > missing.out 2>&1)
check missing/missing.out 'No expense file found' 'missing data file starts an empty history'
mkdir corrupt && cp "$ROOT/expense_tracker" corrupt/ && cp -R data corrupt/ && printf X | dd of=corrupt/data/expenses.dat bs=1 seek=0 conv=notrunc 2>/dev/null
if (cd corrupt && ./expense_tracker </dev/null > corrupt.out 2>&1); then echo 'FAIL: corrupted file accepted'; exit 1; else echo 'PASS: corrupted file is rejected'; fi
printf 'nonsense\n0\n' | ./expense_tracker > menu.out 2>&1
check menu.out 'Invalid number or value' 'invalid menu input is rejected'
mkdir long && cp "$ROOT/expense_tracker" long/ && long_text=$(awk 'BEGIN {for(i=0;i<110;i++)printf "x"}')
(cd long && { printf '2\n20-11-2026\n1\n%s\nRecovered description\n10\n1\n\ny\n\n0\n' "$long_text" | ./expense_tracker > long.out 2>&1; })
check long/long.out 'Input is too long' 'overlong description is detected'
check long/long.out 'Expense saved successfully' 'description can be re-entered after overflow'
printf '0\n' | env -i PATH="$PATH" EXPENSE_TRACKER_COLOR=1 TERM=xterm ./expense_tracker > ansi.out 2>&1
if od -An -tx1 ansi.out | grep -q '1b'; then echo 'PASS: optional ANSI colors can be enabled'; else echo 'FAIL: ANSI color option produced no escape codes'; exit 1; fi
printf '0\n' | env -i PATH="$PATH" EXPENSE_TRACKER_COLOR=1 NO_COLOR=1 TERM=xterm ./expense_tracker > plain.out 2>&1
if od -An -tx1 plain.out | grep -q '1b'; then echo 'FAIL: NO_COLOR did not disable ANSI codes'; exit 1; else echo 'PASS: NO_COLOR forces plain text'; fi
echo 'Smoke checks complete.'
