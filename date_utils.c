#include "date_utils.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

bool isLeapYear(int year) { return year > 0 && year % 4 == 0 && (year % 100 != 0 || year % 400 == 0); }

bool parseDate(const char *text, Date *out) {
    int d, m, y;
    static const int days[] = {0,31,28,31,30,31,30,31,31,30,31,30,31};
    if (!text || !out || strlen(text)!=10 || text[2]!='-' || text[5]!='-') return false;
    for(int i=0;i<10;i++) if(i!=2&&i!=5&&(text[i]<'0'||text[i]>'9')) return false;
    if (sscanf(text, "%2d-%2d-%4d", &d, &m, &y) != 3) return false;
    if (m < 1 || m > 12 || y < 1 || y > 9999) return false;
    int maxDay = days[m] + (m == 2 && isLeapYear(y));
    if (d < 1 || d > maxDay) return false;
    out->day = d; out->month = m; out->year = y; return true;
}

int compareDates(Date a, Date b) {
    if (a.year != b.year) return (a.year > b.year) - (a.year < b.year);
    if (a.month != b.month) return (a.month > b.month) - (a.month < b.month);
    return (a.day > b.day) - (a.day < b.day);
}

bool currentDate(Date *out) {
    time_t now = time(NULL); struct tm *local;
    if (!out || now == (time_t)-1 || !(local = localtime(&now))) return false;
    out->day = local->tm_mday; out->month = local->tm_mon + 1; out->year = local->tm_year + 1900;
    return true;
}

void formatDate(Date date, char *buffer, unsigned long size) {
    if (buffer && size) (void)snprintf(buffer, (size_t)size, "%02d-%02d-%04d", date.day, date.month, date.year);
}
