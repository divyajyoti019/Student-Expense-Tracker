#ifndef DATE_UTILS_H
#define DATE_UTILS_H
#include <stdbool.h>
typedef struct { int day, month, year; } Date;
bool isLeapYear(int year);
bool parseDate(const char *text, Date *out);
int compareDates(Date a, Date b);
bool currentDate(Date *out);
void formatDate(Date date, char *buffer, unsigned long size);
#endif
