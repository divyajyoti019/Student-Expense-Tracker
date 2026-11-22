#include "budget.h"
#include "date_utils.h"
#include "storage.h"
#include "ui.h"
#include "validation.h"
#include <stdio.h>
#include <string.h>

const Budget *findBudget(const AppState *app,int month,int year){for(size_t i=0;i<app->budgetCount;i++)if(app->budgets[i].month==month&&app->budgets[i].year==year)return &app->budgets[i];return NULL;}
double calculateMonthlyExpenses(const AppState *app,int month,int year){double total=0;for(size_t i=0;i<app->transactionCount;i++){Date d;if(parseDate(app->transactions[i].expense.date,&d)&&d.month==month&&d.year==year)total+=app->transactions[i].expense.amount;}return total;}
double calculateRemainingBudget(const AppState *app,int month,int year){const Budget *b=findBudget(app,month,year);return b?b->budgetAmount-calculateMonthlyExpenses(app,month,year):0;}
const char *budgetStatus(double u){if(u<50)return "Healthy spending";if(u<80)return "Normal spending";if(u<100)return "Warning: approaching budget limit";return "Alert: budget exceeded";}
int setMonthlyBudget(AppState *app){int month,year;double amount;if(!readInt("Month (1-12): ",1,12,&month)||!readInt("Year (1-9999): ",1,9999,&year)||!readDouble("Budget in Rs. (0 to 1,000,000,000): ",0,1000000000,&amount))return 0;
    size_t i;for(i=0;i<app->budgetCount;i++)if(app->budgets[i].month==month&&app->budgets[i].year==year)break;
    int added=i==app->budgetCount;Budget old={0};if(added){if(app->budgetCount>=MAX_BUDGETS||!reserveBudgets(app,i+1)){printError("Could not allocate budget record.");return 0;}app->budgetCount++;}else old=app->budgets[i];
    memset(&app->budgets[i],0,sizeof app->budgets[i]);app->budgets[i].month=month;app->budgets[i].year=year;app->budgets[i].budgetAmount=amount;if(!saveBudgets(app)){if(added)app->budgetCount--;else app->budgets[i]=old;printError("Budget could not be saved; change rolled back.");return 0;}printSuccess("Monthly budget saved.");return 1;
}
static void showBudget(const AppState *app,int month,int year){const Budget *b=findBudget(app,month,year);double spent=calculateMonthlyExpenses(app,month,year);printSection("MONTHLY BUDGET SUMMARY");printf("  Period: %02d-%04d\n  Spending: Rs. %.2f\n",month,year,spent);if(!b){printInfo("No budget is configured for this month.");return;}double util=b->budgetAmount>0?spent/b->budgetAmount*100:0;printf("  Budget: Rs. %.2f\n  Remaining: Rs. %.2f\n  Utilization: ",b->budgetAmount,b->budgetAmount-spent);if(b->budgetAmount>0)printf("%.2f%%\n",util);else puts("N/A");if(b->budgetAmount>0)printBudgetStatus(budgetStatus(util));else printInfo("Zero budget; utilization is unavailable.");}
void budgetMenu(AppState *app){for(;;){printSection("BUDGET MANAGEMENT");puts("1. Set or update monthly budget\n2. View current month\n3. View selected month\n4. View all saved budgets\n0. Return");int choice;if(!readInt("Choice: ",0,4,&choice)){if(feof(stdin))return;continue;}if(!choice)return;
        if(choice==1)(void)setMonthlyBudget(app);
        else if(choice==2){Date d;if(currentDate(&d))showBudget(app,d.month,d.year);}
        else if(choice==3){int m,y;if(readInt("Month: ",1,12,&m)&&readInt("Year: ",1,9999,&y))showBudget(app,m,y);}
        else{if(!app->budgetCount)printInfo("No saved budgets.");for(size_t i=0;i<app->budgetCount;i++)showBudget(app,app->budgets[i].month,app->budgets[i].year);}
        waitForEnter();}}
