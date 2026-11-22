#include "budget.h"
#include "common.h"
#include "date_utils.h"
#include "expense.h"
#include "storage.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int tests=0,failures=0;
#define CHECK(name,expr) do { tests++; if(expr) printf("PASS %02d: %s\n",tests,name); else { printf("FAIL %02d: %s\n",tests,name); failures++; } } while(0)

int main(void){
    Date a,b;
    CHECK("2024 is leap year",isLeapYear(2024));
    CHECK("1900 is not leap year",!isLeapYear(1900));
    CHECK("2000 is leap year",isLeapYear(2000));
    CHECK("year zero is not a leap year",!isLeapYear(0));
    CHECK("accept valid leap day",parseDate("29-02-2024",&a));
    CHECK("reject non-leap February 29",!parseDate("29-02-2023",&a));
    CHECK("reject month 13",!parseDate("01-13-2024",&a));
    CHECK("reject invalid day in April",!parseDate("31-04-2024",&a));
    CHECK("require DD-MM-YYYY width",!parseDate("1-2-2024",&a));
    CHECK("reject nonnumeric date",!parseDate("aa-01-2024",&a));
    parseDate("31-12-2025",&a);parseDate("01-01-2026",&b);
    CHECK("compare across year boundary",compareDates(a,b)<0);
    parseDate("01-02-2026",&a);parseDate("01-03-2026",&b);
    CHECK("compare month values",compareDates(a,b)<0);
    parseDate("01-03-2026",&a);parseDate("02-03-2026",&b);
    CHECK("compare day values",compareDates(a,b)<0);
    CHECK("map Food category",categoryFromName("Food")==FOOD);
    CHECK("reject unknown predefined category",categoryFromName("Unknown")==-1);

    AppState app={0};app.nextId=1;
    CHECK("allocate transaction capacity",reserveTransactions(&app,2));
    memset(&app.transactions[0],0,sizeof(Transaction));
    app.transactions[0].expense.id=7;strcpy(app.transactions[0].expense.date,"20-11-2026");
    app.transactions[0].expense.category=FOOD;strcpy(app.transactions[0].expense.description,"Meal");app.transactions[0].expense.amount=100;
    app.transactions[0].paymentType=UPI;strcpy(app.transactions[0].paymentDetails.upiId,"student@upi");
    app.transactions[1]=app.transactions[0];app.transactions[1].expense.id=8;strcpy(app.transactions[1].expense.date,"19-11-2026");
    app.transactions[1].expense.amount=200;app.transactions[1].paymentType=CARD;memset(&app.transactions[1].paymentDetails,0,sizeof(PaymentDetails));strcpy(app.transactions[1].paymentDetails.cardLastFourDigits,"1234");
    CHECK("allocate custom category capacity",reserveCategories(&app,1));
    memset(app.customCategories[0],0,CATEGORY_NAME_SIZE);strcpy(app.customCategories[0],"Books");app.categoryCount=1;
    app.transactions[1].expense.category=OTHER;strcpy(app.transactions[1].expense.categoryLabel,"Books");
    app.transactionCount=2;
    CHECK("find existing expense ID",findExpenseById(&app,8)==1);
    CHECK("missing expense ID returns -1",findExpenseById(&app,99)==-1);
    CHECK("map custom category to its own report bucket",categoryIndexForTransaction(&app,&app.transactions[1])==CATEGORY_COUNT);
    CHECK("calculate selected month spending",calculateMonthlyExpenses(&app,11,2026)==300.0);
    CHECK("other month has zero spend",calculateMonthlyExpenses(&app,10,2026)==0.0);
    CHECK("missing budget has zero remaining",calculateRemainingBudget(&app,11,2026)==0.0);
    CHECK("healthy status below fifty",strcmp(budgetStatus(49.99),"Healthy spending")==0);
    CHECK("normal status at fifty",strcmp(budgetStatus(50),"Normal spending")==0);
    CHECK("normal status below eighty",strcmp(budgetStatus(79.99),"Normal spending")==0);
    CHECK("warning status at eighty",strcmp(budgetStatus(80),"Warning: approaching budget limit")==0);
    CHECK("exceeded at one hundred",strcmp(budgetStatus(100),"Alert: budget exceeded")==0);

    CHECK("create data directories",ensureDataDirectories());
    CHECK("allocate budget capacity",reserveBudgets(&app,1));
    app.budgets[0]=(Budget){11,2026,500};app.budgetCount=1;
    CHECK("calculate budget remaining",calculateRemainingBudget(&app,11,2026)==200.0);
    CHECK("save tagged-union expense records",saveExpenses(&app));
    CHECK("save budget record",saveBudgets(&app));
    CHECK("save custom category",saveCategories(&app));
    AppState loaded={0};loaded.nextId=1;
    CHECK("load persistent records",loadAllData(&loaded)==1);
    CHECK("persisted transaction count",loaded.transactionCount==2);
    CHECK("persisted UPI active union field",loaded.transactions[0].paymentType==UPI&&strcmp(loaded.transactions[0].paymentDetails.upiId,"student@upi")==0);
    CHECK("persisted card last four",loaded.transactions[1].paymentType==CARD&&strcmp(loaded.transactions[1].paymentDetails.cardLastFourDigits,"1234")==0);
    CHECK("persisted monthly budget",findBudget(&loaded,11,2026)&&findBudget(&loaded,11,2026)->budgetAmount==500);
    CHECK("persisted category label matches saved category",loaded.categoryCount==1&&strcmp(loaded.customCategories[0],"Books")==0);
    app.transactions[1].expense.id=app.transactions[0].expense.id;
    CHECK("write duplicate ID fixture",saveExpenses(&app));
    AppState invalid={0};invalid.nextId=1;
    CHECK("reject duplicate expense IDs on load",loadAllData(&invalid)==0);
    appStateFree(&invalid);appStateFree(&loaded);appStateFree(&app);
    printf("Executed %d checks; %d failed.\n",tests,failures);
    return failures?1:0;
}
