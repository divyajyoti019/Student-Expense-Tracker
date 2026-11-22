CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -Wpedantic -O2
LDFLAGS =
SOURCES = main.c expense.c budget.c reports.c storage.c validation.c date_utils.c ui.c
OBJECTS = $(SOURCES:.c=.o)

.PHONY: all run clean test
all: expense_tracker

expense_tracker: $(OBJECTS)
	$(CC) $(CFLAGS) $(OBJECTS) $(LDFLAGS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

run: expense_tracker
	./expense_tracker

test: expense_tracker
	$(CC) $(CFLAGS) -I. tests/test_core.c expense.c budget.c reports.c storage.c validation.c date_utils.c ui.c -o tests/test_core
	@set -e; tmpdir=$$(mktemp -d); trap 'rm -rf "$$tmpdir" tests/test_core' EXIT HUP INT TERM; cd "$$tmpdir"; "$(CURDIR)/tests/test_core"; cd "$(CURDIR)"; sh tests/smoke.sh

clean:
	rm -f $(OBJECTS) expense_tracker
