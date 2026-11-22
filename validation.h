#ifndef VALIDATION_H
#define VALIDATION_H
#include <stdbool.h>
#include <stddef.h>
bool readLine(const char *prompt, char *buffer, size_t size);
bool readInt(const char *prompt, int min, int max, int *out);
bool readDouble(const char *prompt, double min, double max, double *out);
bool readRequiredString(const char *prompt, char *buffer, size_t size);
bool readOptionalString(const char *prompt, char *buffer, size_t size);
bool validateAmount(double amount);
void waitForEnter(void);
#endif
