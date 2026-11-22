#ifndef COMMON_H
#define COMMON_H

#include <stdbool.h>
#include <stddef.h>

#define DATE_SIZE 15
#define DESCRIPTION_SIZE 100
#define CATEGORY_NAME_SIZE 50
#define PAYMENT_DETAIL_SIZE 50
#define MAX_RECORDS 100000U
#define MAX_CATEGORIES 64U
#define MAX_BUDGETS 2400U

typedef enum {
    FOOD, TRANSPORT, EDUCATION, SHOPPING, ENTERTAINMENT, HOSTEL,
    MOBILE_INTERNET, HEALTHCARE, OTHER, CATEGORY_COUNT
} ExpenseCategory;

typedef enum { CASH, UPI, CARD, PAYMENT_COUNT } PaymentType;

typedef struct {
    int id;
    char date[DATE_SIZE];
    ExpenseCategory category;
    char categoryLabel[CATEGORY_NAME_SIZE]; /* Set only for a custom category. */
    char description[DESCRIPTION_SIZE];
    double amount;
} Expense;

typedef union {
    char upiId[PAYMENT_DETAIL_SIZE];
    char cardLastFourDigits[5];
    char cashNote[PAYMENT_DETAIL_SIZE];
} PaymentDetails;

typedef struct {
    Expense expense;
    PaymentType paymentType;
    PaymentDetails paymentDetails;
} Transaction;

typedef struct { int month, year; double budgetAmount; } Budget;

typedef struct {
    Transaction *transactions;
    size_t transactionCount, transactionCapacity;
    Budget *budgets;
    size_t budgetCount, budgetCapacity;
    char (*customCategories)[CATEGORY_NAME_SIZE];
    size_t categoryCount, categoryCapacity;
    int nextId;
} AppState;

extern const char *const CATEGORY_NAMES[CATEGORY_COUNT];
extern const char *const PAYMENT_NAMES[PAYMENT_COUNT];

const char *categoryName(const Transaction *transaction);
int categoryFromName(const char *name);
size_t categoryIndexForTransaction(const AppState *app, const Transaction *transaction);
const char *categoryDisplayNameAt(const AppState *app, size_t index);
int findExpenseById(const AppState *app, int id);
bool reserveTransactions(AppState *app, size_t needed);
bool reserveBudgets(AppState *app, size_t needed);
bool reserveCategories(AppState *app, size_t needed);
void appStateFree(AppState *app);

#endif
