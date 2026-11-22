#ifndef REPORTS_H
#define REPORTS_H
#include "common.h"
void reportsMenu(const AppState *app);
int exportMonthlyReport(const AppState *app, int month, int year);
#endif
