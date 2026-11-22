#ifndef STORAGE_H
#define STORAGE_H
#include "common.h"
int loadAllData(AppState *app);
int saveExpenses(const AppState *app);
int saveBudgets(const AppState *app);
int saveCategories(const AppState *app);
int ensureDataDirectories(void);
#endif
