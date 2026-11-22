#ifndef BUDGET_H
#define BUDGET_H
#include "common.h"
int setMonthlyBudget(AppState *app);
void budgetMenu(AppState *app);
double calculateMonthlyExpenses(const AppState *app, int month, int year);
double calculateRemainingBudget(const AppState *app, int month, int year);
const Budget *findBudget(const AppState *app, int month, int year);
const char *budgetStatus(double utilization);
#endif
