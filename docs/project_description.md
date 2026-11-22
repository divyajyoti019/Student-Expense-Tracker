# Project Synopsis

## Title

**Student Expense and Budget Management System Using C**

**Course:** CSET333 – C Programming · **Level:** Intermediate · **Language:** C11

## Introduction

Students pay for meals, transport, education, housing, internet, health, and recreation. When these expenses are not recorded, students may not know where their money goes or whether they are following a monthly spending plan. This project provides a small offline program for recording transactions and calculating financial summaries.

## Problem statement

Students often lack a simple, organized record of daily expenses. The resulting lack of visibility can make it difficult to identify frequent spending categories, compare monthly expenditure with a budget, and recognize unnecessary purchases.

## Objectives

1. Record dated expenses with descriptions, categories, amounts, and payment methods.
2. Search, update, and remove transaction records.
3. Maintain a separate budget for each month and year.
4. Calculate monthly expense totals, balance, utilization, and alerts.
5. Generate useful daily, monthly, yearly, category, and payment summaries.
6. Preserve transactions, budgets, and user categories in local files.
7. Demonstrate C structures, enums, unions, functions, arrays, pointers, validation, and file operations.

## Scope

The program is a single-user terminal application. It stores data below the current working directory and does not connect to banks or external services. It accepts Indian rupee amounts. Transaction categories include Food, Transport, Education, Shopping, Entertainment, Hostel/Rent, Mobile/Internet, Healthcare, and Other, with optional user-defined categories.

## Method

The program initializes an `AppState`, loads versioned binary records, and dispatches menu selections to focused modules. Numeric and text input is bounded and validated. Transaction edits are assembled in a temporary local copy and committed only after confirmation and a successful file replacement. Reports calculate their values from loaded transactions.

## Expected outcome

The student can add and find expenses, compare selected month spending with a budget, inspect reports, and restart the program without losing saved data. The implementation is designed to be discussed module-by-module in a C programming viva.

## Limitations

Files are local and unencrypted. The binary layout is intended for the same compiler and architecture. The program is an educational tracker and does not provide bank-grade security or financial advice.
