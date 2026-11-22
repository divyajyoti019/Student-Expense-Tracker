#ifndef EXPENSE_H
#define EXPENSE_H
#include "common.h"
int addExpense(AppState *app);
void viewExpenses(const AppState *app);
void searchExpenses(const AppState *app);
int updateExpense(AppState *app);
int deleteExpense(AppState *app);
void sortAndFilterExpenses(const AppState *app);
void manageCategories(AppState *app);
#endif
