#ifndef UI_H
#define UI_H
#include "common.h"
void uiInitialize(void);
void displayWelcome(void);
void displayMainMenu(void);
void displayDashboard(const AppState *app);
void printTransaction(const Transaction *transaction);
void printTransactionTableHeader(void);
void printTransactionTableRow(const Transaction *transaction);
void printSection(const char *title);
void printMessage(const char *message);
void printSuccess(const char *message);
void printError(const char *message);
void printWarning(const char *message);
void printInfo(const char *message);
void printBudgetStatus(const char *status);
void printSeparator(void);
#endif
