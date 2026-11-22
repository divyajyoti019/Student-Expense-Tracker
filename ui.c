#include "ui.h"
#include "budget.h"
#include "date_utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define FRAME_WIDTH 72
#define TABLE_DESCRIPTION_WIDTH 28

static int ansiEnabled;

void uiInitialize(void) {
    const char *enable = getenv("EXPENSE_TRACKER_COLOR");
    const char *term = getenv("TERM");
    ansiEnabled = enable && strcmp(enable, "1") == 0 &&
                  getenv("NO_COLOR") == NULL && (!term || strcmp(term, "dumb") != 0);
}

static void setColor(const char *code) { if (ansiEnabled) fputs(code, stdout); }
static void resetColor(void) { if (ansiEnabled) fputs("\033[0m", stdout); }

void printSeparator(void) {
    setColor("\033[36m");
    putchar('+');
    for (int i = 0; i < FRAME_WIDTH; ++i) putchar('-');
    puts("+");
    resetColor();
}

static void printFramedLine(const char *text) {
    size_t length = strlen(text);
    if (length > FRAME_WIDTH) length = FRAME_WIDTH;
    size_t left = (FRAME_WIDTH - length) / 2;
    size_t right = FRAME_WIDTH - length - left;
    setColor("\033[36m"); putchar('|'); resetColor();
    for (size_t i = 0; i < left; ++i) putchar(' ');
    setColor("\033[1;36m"); fwrite(text, 1, length, stdout); resetColor();
    for (size_t i = 0; i < right; ++i) putchar(' ');
    setColor("\033[36m"); putchar('|'); resetColor();
    putchar('\n');
}

static void statusMessage(FILE *stream, const char *label, const char *message,
                          const char *color) {
    if (ansiEnabled) fprintf(stream, "%s", color);
    fprintf(stream, "[%s]", label);
    if (ansiEnabled) fputs("\033[0m", stream);
    fprintf(stream, " %s\n", message);
}

void printSuccess(const char *message) { statusMessage(stdout, "SUCCESS", message, "\033[32m"); }
void printError(const char *message) { statusMessage(stderr, "ERROR", message, "\033[31m"); }
void printWarning(const char *message) { statusMessage(stdout, "WARNING", message, "\033[33m"); }
void printInfo(const char *message) { statusMessage(stdout, "INFO", message, "\033[36m"); }

void printBudgetStatus(const char *status) {
    if (!status) return;
    if (strncmp(status, "Alert:", 6) == 0) statusMessage(stdout, "ALERT", status, "\033[31m");
    else if (strncmp(status, "Warning:", 8) == 0) printWarning(status);
    else if (strncmp(status, "Healthy", 7) == 0) printSuccess(status);
    else printInfo(status);
}

void printSection(const char *title) {
    printSeparator();
    printFramedLine(title ? title : "");
    printSeparator();
}

void printMessage(const char *message) { if (message) printf("\n%s\n", message); }

void displayWelcome(void) {
    puts("");
    printSeparator();
    printFramedLine("STUDENT EXPENSE & BUDGET TRACKER");
    printFramedLine("PERSONAL FINANCE MANAGER");
    printSeparator();
    puts("");
    puts("                    Track today. Plan the month.");
    puts("                         Stay on budget.");
    puts("");
    puts("                         VERSION 1.0");
    puts("");
    printSeparator();
    puts("");
}

void displayMainMenu(void) {
    printSection("MAIN MENU");
    puts("  1   Dashboard                 2   Add a new expense");
    puts("  3   View expenses             4   Search expenses");
    puts("  5   Update an expense         6   Delete an expense");
    puts("  7   Budget management         8   Expense reports");
    puts("  9   Sort and filter            10  Category management");
    puts(" 11   Export monthly report     12  About this project");
    puts(" 13   Help                       0  Exit");
    puts("");
}

void printTransactionTableHeader(void) {
    puts("+------------+------------+--------------------+------------------------------+--------------+----------+");
    puts("| ID         | DATE       | CATEGORY           | DESCRIPTION                  | AMOUNT (Rs.) | PAYMENT  |");
    puts("+------------+------------+--------------------+------------------------------+--------------+----------+");
}

void printTransactionTableRow(const Transaction *transaction) {
    char description[TABLE_DESCRIPTION_WIDTH + 1];
    const char *source = transaction->expense.description;
    size_t length = strlen(source);
    if (length > TABLE_DESCRIPTION_WIDTH) {
        memcpy(description, source, TABLE_DESCRIPTION_WIDTH - 3);
        memcpy(description + TABLE_DESCRIPTION_WIDTH - 3, "...", 4);
    } else {
        memcpy(description, source, length + 1);
    }
    printf("| %-10d | %-10.10s | %-18.18s | %-28s | %12.2f | %-8s |\n",
           transaction->expense.id, transaction->expense.date,
           categoryName(transaction), description, transaction->expense.amount,
           PAYMENT_NAMES[transaction->paymentType]);
}

void printTransaction(const Transaction *transaction) {
    printSection("TRANSACTION DETAILS");
    printf("  %-18s %d\n", "Expense ID:", transaction->expense.id);
    printf("  %-18s %s\n", "Date:", transaction->expense.date);
    printf("  %-18s %s\n", "Category:", categoryName(transaction));
    printf("  %-18s %s\n", "Description:", transaction->expense.description);
    printf("  %-18s Rs. %.2f\n", "Amount:", transaction->expense.amount);
    printf("  %-18s %s\n", "Payment method:", PAYMENT_NAMES[transaction->paymentType]);
}

static void dashboardMetric(const char *label, const char *value) {
    printf("  %-29s %s\n", label, value);
}

static void dashboardAmount(char *buffer, size_t size, double amount) {
    (void)snprintf(buffer, size, "Rs. %.2f", amount);
}

void displayDashboard(const AppState *app) {
    Date today = {1, 1, 1};
    double lifetime = 0.0, high = 0.0, low = 0.0;
    size_t categoryCounts[CATEGORY_COUNT + MAX_CATEGORIES] = {0};
    size_t payCounts[PAYMENT_COUNT] = {0};
    size_t monthCount = 0, highCategory = 0;
    double monthSpend = 0.0;
    int topPayment = 0;
    char value[64];

    (void)currentDate(&today);
    for (size_t i = 0; i < app->transactionCount; ++i) {
        const Transaction *transaction = &app->transactions[i];
        const Expense *expense = &transaction->expense;
        Date date;
        lifetime += expense->amount;
        if (i == 0 || expense->amount > high) high = expense->amount;
        if (i == 0 || expense->amount < low) low = expense->amount;
        categoryCounts[categoryIndexForTransaction(app, transaction)]++;
        payCounts[transaction->paymentType]++;
        if (parseDate(expense->date, &date) && date.month == today.month && date.year == today.year) {
            ++monthCount;
            monthSpend += expense->amount;
        }
    }
    for (size_t i = 1; i < CATEGORY_COUNT + app->categoryCount; ++i)
        if (categoryCounts[i] > categoryCounts[highCategory]) highCategory = i;
    for (size_t i = 1; i < PAYMENT_COUNT; ++i)
        if (payCounts[i] > payCounts[topPayment]) topPayment = (int)i;

    const Budget *budget = findBudget(app, today.month, today.year);
    double budgetAmount = budget ? budget->budgetAmount : 0.0;
    double utilization = budgetAmount > 0.0 ? monthSpend / budgetAmount * 100.0 : 0.0;

    printSection("STUDENT FINANCE DASHBOARD");
    printf("  Reporting period: %02d-%04d\n\n", today.month, today.year);
    puts("  MONTHLY BUDGET");
    dashboardAmount(value, sizeof value, monthSpend); dashboardMetric("Current month spending", value);
    if (budget) dashboardAmount(value, sizeof value, budgetAmount);
    else (void)snprintf(value, sizeof value, "Not set");
    dashboardMetric("Monthly budget", value);
    if (budget) dashboardAmount(value, sizeof value, budgetAmount - monthSpend);
    else (void)snprintf(value, sizeof value, "Not available");
    dashboardMetric("Remaining budget", value);
    if (budget && budgetAmount > 0.0) (void)snprintf(value, sizeof value, "%.2f%%", utilization);
    else (void)snprintf(value, sizeof value, "N/A");
    dashboardMetric("Budget utilization", value);
    if (budget && budgetAmount > 0.0) { printInfo("Budget status:"); printBudgetStatus(budgetStatus(utilization)); }
    else if (budget) printInfo("Zero budget; utilization is unavailable.");
    else printInfo("No budget is configured for this month.");

    puts("\n  SPENDING OVERVIEW");
    dashboardAmount(value, sizeof value, lifetime); dashboardMetric("Lifetime expenses", value);
    (void)snprintf(value, sizeof value, "%zu", app->transactionCount); dashboardMetric("Total transactions", value);
    (void)snprintf(value, sizeof value, "%zu", monthCount); dashboardMetric("Transactions this month", value);
    if (app->transactionCount) {
        dashboardAmount(value, sizeof value, high); dashboardMetric("Highest expense", value);
        dashboardAmount(value, sizeof value, low); dashboardMetric("Lowest expense", value);
        dashboardAmount(value, sizeof value, lifetime / (double)app->transactionCount); dashboardMetric("Average transaction", value);
        dashboardMetric("Most frequent category", categoryDisplayNameAt(app, highCategory));
        dashboardMetric("Most used payment method", PAYMENT_NAMES[topPayment]);
    } else {
        dashboardMetric("Highest expense", "N/A");
        dashboardMetric("Lowest expense", "N/A");
        dashboardMetric("Average transaction", "N/A");
        dashboardMetric("Most frequent category", "N/A");
        dashboardMetric("Most used payment method", "N/A");
    }
    printSeparator();
}
