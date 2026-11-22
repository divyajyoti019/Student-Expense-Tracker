#include "storage.h"
#include "date_utils.h"
#include "ui.h"
#include <errno.h>
#include <math.h>
#include <stdint.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#ifdef _WIN32
#include <direct.h>
#define MKDIR(path) _mkdir(path)
#else
#include <sys/stat.h>
#define MKDIR(path) mkdir(path, 0775)
#endif

#define FILE_VERSION 1U
typedef struct { char magic[8]; unsigned version; unsigned long long count; } FileHeader;
static void storageError(const char *format, ...) {
    char message[256];
    va_list args;
    va_start(args, format);
    (void)vsnprintf(message, sizeof message, format, args);
    va_end(args);
    printError(message);
}
static int writeAtomic(const char *path, const char *temp, const void *header, size_t headerSize,
                       const void *records, size_t recordSize, size_t count) {
    FILE *f = fopen(temp, "wb");
    if (!f) { storageError("Cannot create %s: %s", temp, strerror(errno)); return 0; }
    int ok = fwrite(header, headerSize, 1, f) == 1 && (count == 0 || fwrite(records, recordSize, count, f) == count);
    if (fclose(f) != 0) ok = 0;
    if (!ok) { storageError("Failed writing %s; original file was preserved.", path); (void)remove(temp); return 0; }
#ifdef _WIN32
    char backup[96]; (void)snprintf(backup,sizeof backup,"%s.bak",path);
    if(rename(path,backup)!=0 && errno!=ENOENT){storageError("Cannot preserve %s: %s",path,strerror(errno));(void)remove(temp);return 0;}
    if(rename(temp,path)!=0){int saved=errno;(void)rename(backup,path);storageError("Cannot replace %s: %s",path,strerror(saved));(void)remove(temp);return 0;}
    (void)remove(backup);
#else
    if (rename(temp, path) != 0) { storageError("Cannot replace %s: %s", path, strerror(errno)); (void)remove(temp); return 0; }
#endif
    return 1;
}

int ensureDataDirectories(void) {
    if (MKDIR("data") != 0 && errno != EEXIST) { storageError("Cannot create data directory: %s",strerror(errno)); return 0; }
    if (MKDIR("reports") != 0 && errno != EEXIST) { storageError("Cannot create reports directory: %s",strerror(errno)); return 0; }
    return 1;
}

int saveExpenses(const AppState *app) {
    FileHeader h; memset(&h,0,sizeof h); memcpy(h.magic,"SEXPDATA",8); h.version=FILE_VERSION; h.count=app->transactionCount;
    return writeAtomic("data/expenses.dat", "data/expenses.tmp", &h, sizeof h, app->transactions, sizeof(Transaction), app->transactionCount);
}
int saveBudgets(const AppState *app) {
    FileHeader h; memset(&h,0,sizeof h); memcpy(h.magic,"SBUDGETS",8); h.version=FILE_VERSION; h.count=app->budgetCount;
    return writeAtomic("data/budgets.dat", "data/budgets.tmp", &h, sizeof h, app->budgets, sizeof(Budget), app->budgetCount);
}
int saveCategories(const AppState *app) {
    FileHeader h; memset(&h,0,sizeof h); memcpy(h.magic,"SCATEGS1",8); h.version=FILE_VERSION; h.count=app->categoryCount;
    return writeAtomic("data/categories.dat", "data/categories.tmp", &h, sizeof h, app->customCategories, sizeof(*app->customCategories), app->categoryCount);
}

static int finishRead(FILE *f, size_t recordSize, size_t count) {
    if (count && (fseek(f, 0, SEEK_END) != 0 || (unsigned long long)ftell(f) != sizeof(FileHeader) + (unsigned long long)recordSize * count)) return 0;
    if (!count && (fseek(f,0,SEEK_END)!=0 || ftell(f)!=(long)sizeof(FileHeader))) return 0;
    return 1;
}
static int equalNoCase(const char *a,const char *b){while(*a&&*b){if(tolower((unsigned char)*a)!=tolower((unsigned char)*b))return 0;a++;b++;}return *a==*b;}
static int openRecords(const char *path, const char *magic, size_t recordSize, size_t maxCount, FILE **f, size_t *count) {
    *f = fopen(path, "rb"); if (!*f) { if (errno == ENOENT) return 2; storageError("Cannot open %s: %s",path,strerror(errno)); return 0; }
    FileHeader h;
    if (fread(&h,sizeof h,1,*f)!=1 || memcmp(h.magic,magic,8) || h.version!=FILE_VERSION || h.count>maxCount || h.count>SIZE_MAX/recordSize) {
        storageError("Corrupted or unsupported data file: %s",path); fclose(*f); *f=NULL; return 0;
    }
    *count=(size_t)h.count;
    if (!finishRead(*f,recordSize,*count)) { storageError("Invalid file size: %s",path); fclose(*f); *f=NULL; return 0; }
    if (fseek(*f,(long)sizeof h,SEEK_SET)!=0) { fclose(*f); *f=NULL; return 0; }
    return 1;
}
static int validTransaction(const Transaction *t) {
    Date d; const Expense *e=&t->expense;
    if(e->id<=0 || !memchr(e->date,'\0',sizeof e->date) || !parseDate(e->date,&d) || e->category<0 || e->category>=CATEGORY_COUNT ||
       !memchr(e->description,'\0',sizeof e->description) || !e->description[0] ||
       !isfinite(e->amount) || e->amount<=0 || e->amount>1000000000.0 || t->paymentType<0 || t->paymentType>=PAYMENT_COUNT) return 0;
    if(!memchr(e->categoryLabel,'\0',sizeof e->categoryLabel)) return 0;
    if(e->category!=OTHER && e->categoryLabel[0]) return 0;
    if(t->paymentType==UPI && !memchr(t->paymentDetails.upiId,'\0',sizeof t->paymentDetails.upiId)) return 0;
    if(t->paymentType==CASH && !memchr(t->paymentDetails.cashNote,'\0',sizeof t->paymentDetails.cashNote)) return 0;
    if(t->paymentType==CARD) {
        const char *s=t->paymentDetails.cardLastFourDigits;
        if(s[4]!='\0') return 0;
        for(int i=0;i<4;i++) if(s[i]<'0'||s[i]>'9') return 0;
    }
    return 1;
}
static int compareIds(const void *left,const void *right){int a=*(const int *)left,b=*(const int *)right;return (a>b)-(a<b);}
int loadAllData(AppState *app) {
    if(!ensureDataDirectories()) return 0;
    FILE *f=NULL; size_t n=0; int status=openRecords("data/expenses.dat","SEXPDATA",sizeof(Transaction),MAX_RECORDS,&f,&n);
    if(status==0) return 0;
    if(status==1) {
        if(n && !reserveTransactions(app,n)) { fclose(f); return 0; }
        int *ids=n?malloc(n*sizeof *ids):NULL;
        if(n&&!ids){storageError("Memory allocation failed while validating expense IDs.");fclose(f);return 0;}
        for(size_t i=0;i<n;i++) {
            Transaction t;
            if(fread(&t,sizeof t,1,f)!=1 || !validTransaction(&t)) { storageError("Invalid transaction record in expenses.dat"); free(ids); fclose(f); return 0; }
            ids[i]=t.expense.id; app->transactions[i]=t; if(t.expense.id>=app->nextId && t.expense.id<2147483647) app->nextId=t.expense.id+1;
        }
        qsort(ids,n,sizeof *ids,compareIds);
        for(size_t i=1;i<n;i++)if(ids[i]==ids[i-1]){storageError("Duplicate ID in expenses.dat");free(ids);fclose(f);return 0;}
        free(ids);
        app->transactionCount=n; fclose(f);
    } else printInfo("No expense file found; starting with an empty history.");
    status=openRecords("data/budgets.dat","SBUDGETS",sizeof(Budget),MAX_BUDGETS,&f,&n);
    if(status==0) return 0;
    if(status==1) {
        if(n && !reserveBudgets(app,n)) { fclose(f); return 0; }
        for(size_t i=0;i<n;i++) { Budget b; if(fread(&b,sizeof b,1,f)!=1 || b.month<1 || b.month>12 || b.year<1 || b.year>9999 || !isfinite(b.budgetAmount) || b.budgetAmount<0 || b.budgetAmount>1e9) { storageError("Invalid budget record."); fclose(f); return 0; } for(size_t j=0;j<i;j++)if(app->budgets[j].month==b.month&&app->budgets[j].year==b.year){storageError("Duplicate monthly budget record.");fclose(f);return 0;} app->budgets[i]=b; }
        app->budgetCount=n; fclose(f);
    }
    status=openRecords("data/categories.dat","SCATEGS1",CATEGORY_NAME_SIZE,MAX_CATEGORIES,&f,&n);
    if(status==0) return 0;
    if(status==1) {
        if(n && !reserveCategories(app,n)) { fclose(f); return 0; }
        for(size_t i=0;i<n;i++) { char name[CATEGORY_NAME_SIZE]; if(fread(name,sizeof name,1,f)!=1 || !memchr(name,'\0',sizeof name) || !name[0]) { storageError("Invalid custom category."); fclose(f); return 0; } for(size_t j=0;j<i;j++) if(equalNoCase(name,app->customCategories[j])) { storageError("Duplicate custom category."); fclose(f); return 0; } for(int j=0;j<CATEGORY_COUNT;j++)if(equalNoCase(name,CATEGORY_NAMES[j])){storageError("Custom category duplicates a built-in category.");fclose(f);return 0;} memcpy(app->customCategories[i],name,sizeof name); }
        app->categoryCount=n; fclose(f);
    }
    for(size_t i=0;i<app->transactionCount;i++)if(app->transactions[i].expense.category==OTHER&&app->transactions[i].expense.categoryLabel[0]){
        int found=0;for(size_t j=0;j<app->categoryCount;j++)if(strcmp(app->transactions[i].expense.categoryLabel,app->customCategories[j])==0){found=1;break;}
        if(!found){storageError("Transaction references an unknown custom category.");return 0;}
    }
    return 1;
}
