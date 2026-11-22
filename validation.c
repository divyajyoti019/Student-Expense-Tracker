#include "validation.h"
#include "ui.h"
#include <ctype.h>
#include <errno.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

bool readLine(const char *prompt, char *buffer, size_t size) {
    if (!buffer || size < 2) return false;
    if (prompt) { fputs(prompt, stdout); fflush(stdout); }
    if (!fgets(buffer, (int)size, stdin)) return false;
    size_t n = strlen(buffer);
    if (n && buffer[n - 1] == '\n') { buffer[n - 1] = '\0'; if (n > 1 && buffer[n - 2] == '\r') buffer[n - 2] = '\0'; return true; }
    if (feof(stdin) && n < size - 1) return true;
    int ch = getchar();
    if(ch==EOF) return true;
    if(ch=='\n') return true;
    while (ch != '\n' && ch != EOF) ch = getchar();
    printError("Input is too long; please try again.");
    buffer[0] = '\0'; return false;
}

static char *trim(char *s) {
    while (isspace((unsigned char)*s)) ++s;
    char *end = s + strlen(s);
    while (end > s && isspace((unsigned char)end[-1])) --end;
    *end = '\0'; return s;
}

bool readInt(const char *prompt, int min, int max, int *out) {
    char line[128], *end; long value;
    if (!readLine(prompt, line, sizeof line)) return false;
    char *start = trim(line); if (!*start) { printError("Please enter a whole number."); return false; }
    errno = 0; value = strtol(start, &end, 10);
    if (errno || end == start || *trim(end) || value < min || value > max) { printError("Invalid number or value outside the allowed range."); return false; }
    *out = (int)value; return true;
}

bool readDouble(const char *prompt, double min, double max, double *out) {
    char line[128], *end; double value;
    if (!readLine(prompt, line, sizeof line)) return false;
    char *start = trim(line); if (!*start) { printError("Please enter an amount."); return false; }
    errno = 0; value = strtod(start, &end);
    if (errno || end == start || *trim(end) || !isfinite(value) || value < min || value > max) { printError("Invalid amount or value outside the allowed range."); return false; }
    *out = value; return true;
}

static bool readString(const char *prompt, char *buffer, size_t size, bool required) {
    for (;;) {
        if (!readLine(prompt, buffer, size)) { if(feof(stdin)) return false; continue; }
        char *s = trim(buffer);
        if (s != buffer) memmove(buffer, s, strlen(s) + 1);
        if (required && !buffer[0]) { printError("This field cannot be empty."); continue; }
        return true;
    }
}
bool readRequiredString(const char *p, char *b, size_t s) { return readString(p,b,s,true); }
bool readOptionalString(const char *p, char *b, size_t s) { return readString(p,b,s,false); }
bool validateAmount(double amount) { return isfinite(amount) && amount > 0.0 && amount <= 1000000000.0; }
void waitForEnter(void) { char line[8]; (void)readLine("\nPress Enter to continue...", line, sizeof line); }
