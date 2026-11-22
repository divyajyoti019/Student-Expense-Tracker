#include "budget.h"
#include "common.h"
#include "expense.h"
#include "reports.h"
#include "storage.h"
#include "ui.h"
#include "validation.h"
#include <stdio.h>

static void about(void){printSection("ABOUT THIS PROJECT");puts("Student Expense and Budget Management System Using C\nCourse: CSET333 - C Programming | Standard: C11\n\nA local terminal application for recording student expenses, setting monthly budgets, and reviewing spending reports. It demonstrates structures, a tagged union, enums, pointers, dynamic arrays, modular functions, validation, and binary file handling.\n\nCard details are limited to the last four digits; the application never asks for PINs, CVVs, or full card numbers.");}
static void help(void){printSection("HELP AND NAVIGATION");puts("Choose a numbered option and follow the prompts. Enter 0 in a submenu to return to the main menu. Dates use DD-MM-YYYY; amounts are in Indian rupees. Blank optional payment details are allowed. Data is stored in data/ and text exports in reports/.\n\nColor is opt-in: set EXPENSE_TRACKER_COLOR=1. Set NO_COLOR to force plain text; TERM=dumb also disables ANSI colors.");}
int main(void){AppState app={0};app.nextId=1;uiInitialize();displayWelcome();if(!ensureDataDirectories()){printError("Could not create data and report folders.");return 1;}if(!loadAllData(&app)){printError("Saved data could not be loaded safely. Inspect the files in data/ before continuing.");appStateFree(&app);return 1;}printSuccess("Saved data loaded successfully.");
    for(;;){displayMainMenu();int choice;if(!readInt("Enter your choice: ",0,13,&choice)){if(feof(stdin))break;continue;}switch(choice){case 0:printSuccess("Goodbye. Your saved data is ready for next time.");appStateFree(&app);return 0;case 1:displayDashboard(&app);waitForEnter();break;case 2:(void)addExpense(&app);waitForEnter();break;case 3:viewExpenses(&app);waitForEnter();break;case 4:searchExpenses(&app);break;case 5:(void)updateExpense(&app);waitForEnter();break;case 6:(void)deleteExpense(&app);waitForEnter();break;case 7:budgetMenu(&app);break;case 8:reportsMenu(&app);break;case 9:sortAndFilterExpenses(&app);break;case 10:manageCategories(&app);break;case 11:{int m,y;if(readInt("Report month: ",1,12,&m)&&readInt("Report year: ",1,9999,&y))(void)exportMonthlyReport(&app,m,y);waitForEnter();break;}case 12:about();waitForEnter();break;case 13:help();waitForEnter();break;}}
    printInfo("Input ended. Exiting safely.");appStateFree(&app);return 0;
}
