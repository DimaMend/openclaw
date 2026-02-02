---
name: beancount
description: Plain-text double-entry accounting with Beancount - track finances, generate reports, and run Fava web dashboard.
homepage: https://beancount.github.io
metadata:
  {
    "openclaw":
      {
        "emoji": "📒",
        "os": ["darwin", "linux", "win32"],
        "requires": { "bins": ["python3"] },
        "install":
          [
            {
              "id": "pip",
              "kind": "pip",
              "packages": ["beancount", "fava"],
              "bins": ["bean-check", "bean-report", "bean-query", "fava"],
              "label": "Install beancount + fava (pip)",
            },
          ],
      },
  }
---

# Beancount - Plain-Text Accounting

Beancount is a double-entry bookkeeping system that uses plain text files. Perfect for startups tracking revenue, expenses, runway, and investor reporting.

## Core Concepts

### The Ledger File

All transactions live in `.beancount` files (plain text). A typical structure:

```
finance/
├── ledger.beancount      # Main ledger (includes others)
├── accounts.beancount    # Account definitions
├── opening.beancount     # Opening balances
├── 2026/
│   ├── 01.beancount      # January transactions
│   └── 02.beancount      # February transactions
└── prices.beancount      # Asset prices (stocks, crypto)
```

### Account Types

Beancount uses 5 account types (prefixes):

| Type | Purpose | Examples |
|------|---------|----------|
| `Assets` | What you own | Bank accounts, receivables, equipment |
| `Liabilities` | What you owe | Credit cards, loans, payables |
| `Equity` | Owner's stake | Opening balances, retained earnings |
| `Income` | Money coming in | Revenue, interest, investments |
| `Expenses` | Money going out | Salaries, hosting, marketing |

### Account Naming

Use hierarchical names with colons:

```beancount
Assets:Bank:Chase:Checking
Assets:Receivables:Customers
Expenses:Operations:Hosting:AWS
Income:Revenue:MRR:Professional
```

---

## Quick Start

### 1. Create Main Ledger

```beancount
; ledger.beancount - Main ledger file
option "title" "MeshGuard Finances"
option "operating_currency" "USD"

; Include other files
include "accounts.beancount"
include "2026/01.beancount"
```

### 2. Define Accounts

```beancount
; accounts.beancount - Account definitions

; Open date is when the account becomes valid
2026-01-01 open Assets:Bank:Mercury:Checking        USD
2026-01-01 open Assets:Bank:Mercury:Savings         USD
2026-01-01 open Assets:Receivables:Customers        USD
2026-01-01 open Liabilities:CreditCard:Amex         USD
2026-01-01 open Liabilities:Payables:Vendors        USD
2026-01-01 open Equity:OpeningBalances              USD
2026-01-01 open Equity:RetainedEarnings             USD
2026-01-01 open Income:Revenue:MRR:Starter          USD
2026-01-01 open Income:Revenue:MRR:Professional     USD
2026-01-01 open Income:Revenue:MRR:Enterprise       USD
2026-01-01 open Income:Revenue:Services             USD
2026-01-01 open Expenses:Payroll:Salaries           USD
2026-01-01 open Expenses:Payroll:Benefits           USD
2026-01-01 open Expenses:Operations:Hosting         USD
2026-01-01 open Expenses:Operations:Tools           USD
2026-01-01 open Expenses:Marketing:Ads              USD
2026-01-01 open Expenses:Marketing:Events           USD
2026-01-01 open Expenses:Fees:Stripe                USD
2026-01-01 open Expenses:Fees:Bank                  USD
2026-01-01 open Expenses:Legal                      USD
2026-01-01 open Expenses:Travel                     USD
```

### 3. Record Transactions

```beancount
; 2026/01.beancount - January 2026 transactions

2026-01-15 * "Acme Corp" "Professional tier - January MRR"
  Assets:Bank:Mercury:Checking           10,000.00 USD
  Income:Revenue:MRR:Professional       -10,000.00 USD

2026-01-15 * "Stripe" "Processing fee - Acme payment"
  Expenses:Fees:Stripe                      290.00 USD
  Assets:Bank:Mercury:Checking             -290.00 USD

2026-01-20 * "AWS" "January hosting"
  Expenses:Operations:Hosting             1,200.00 USD
  Liabilities:CreditCard:Amex            -1,200.00 USD

2026-01-31 * "Payroll" "January salaries"
  Expenses:Payroll:Salaries              15,000.00 USD
  Assets:Bank:Mercury:Checking          -15,000.00 USD
```

---

## Transaction Syntax

### Basic Format

```beancount
YYYY-MM-DD [*|!] "Payee" "Description"
  Account:Name           AMOUNT CURRENCY
  Account:Name          -AMOUNT CURRENCY
```

- `*` = cleared/completed transaction
- `!` = pending/uncleared transaction
- Amounts must balance to zero (double-entry)

### Automatic Balancing

Omit one amount and Beancount calculates it:

```beancount
2026-01-15 * "Customer" "Payment received"
  Assets:Bank:Mercury:Checking           5,000.00 USD
  Income:Revenue:MRR:Starter  ; Auto-calculated as -5,000.00 USD
```

### Tags and Links

```beancount
2026-01-15 * "Customer" "Q1 contract" #contract #q1 ^invoice-001
  Assets:Receivables:Customers           50,000.00 USD
  Income:Revenue:Services

; Tags: #tag-name (for filtering)
; Links: ^link-name (for connecting related transactions)
```

### Metadata

```beancount
2026-01-15 * "Acme Corp" "Enterprise deal"
  contract: "ENT-2026-001"
  sales_rep: "Matt"
  Assets:Bank:Mercury:Checking           50,000.00 USD
  Income:Revenue:MRR:Enterprise
```

---

## CLI Commands

### Validate Ledger

```bash
# Check for errors
bean-check ledger.beancount

# Verbose output
bean-check -v ledger.beancount
```

### Generate Reports

```bash
# Balance sheet
bean-report ledger.beancount balsheet

# Income statement
bean-report ledger.beancount income

# Trial balance
bean-report ledger.beancount trial

# Cash flow
bean-report ledger.beancount cashflow

# All balances
bean-report ledger.beancount balances

# Journal entries
bean-report ledger.beancount journal

# Specific account journal
bean-report ledger.beancount journal -a "Assets:Bank:Mercury"
```

### Query with BQL

```bash
# Interactive query shell
bean-query ledger.beancount

# Run specific query
bean-query ledger.beancount "SELECT account, sum(position) WHERE account ~ 'Income' GROUP BY account"
```

### Common BQL Queries

```sql
-- Monthly revenue
SELECT month, sum(position) AS revenue
WHERE account ~ 'Income:Revenue'
GROUP BY month
ORDER BY month

-- Expenses by category
SELECT root(account, 2) AS category, sum(position) AS total
WHERE account ~ 'Expenses'
GROUP BY category
ORDER BY total DESC

-- Customer payments this month
SELECT date, payee, narration, position
WHERE account ~ 'Income:Revenue'
  AND month = 2026-01
ORDER BY date

-- Account balances
SELECT account, sum(position) AS balance
WHERE account ~ 'Assets' OR account ~ 'Liabilities'
GROUP BY account

-- Runway calculation (monthly burn)
SELECT month, sum(position) AS net_change
WHERE account ~ 'Assets:Bank'
GROUP BY month
```

---

## Fava Web Dashboard

Fava provides a beautiful web UI for exploring your books.

### Start Fava

```bash
# Basic
fava ledger.beancount

# Custom port
fava -p 5000 ledger.beancount

# Open browser automatically
fava ledger.beancount --open

# Debug mode
fava -d ledger.beancount
```

### Fava Features

- **Balance Sheet**: Visual balance sheet with drill-down
- **Income Statement**: P&L with charts
- **Trial Balance**: All accounts with balances
- **Journal**: Searchable transaction list
- **Query**: Run BQL queries with results
- **Documents**: Link receipts and invoices
- **Editor**: Edit ledger files in-browser
- **Charts**: Automatic visualizations

---

## Startup Finance Patterns

### Monthly Recurring Revenue (MRR)

```beancount
; Track MRR by tier
2026-01-01 open Income:Revenue:MRR:Starter      USD ; $2K/mo
2026-01-01 open Income:Revenue:MRR:Professional USD ; $10K/mo
2026-01-01 open Income:Revenue:MRR:Enterprise   USD ; Custom

; Record subscription payment
2026-01-15 * "Acme Corp" "Professional - January 2026"
  invoice: "INV-2026-001"
  Assets:Bank:Mercury:Checking           10,000.00 USD
  Income:Revenue:MRR:Professional

; Stripe fee (2.9% + $0.30)
2026-01-15 * "Stripe" "Fee - Acme payment"
  Expenses:Fees:Stripe                      320.30 USD
  Assets:Bank:Mercury:Checking             -320.30 USD
```

### Annual Contracts (Deferred Revenue)

```beancount
2026-01-01 open Liabilities:DeferredRevenue     USD

; Customer pays annual upfront
2026-01-01 * "BigCo" "Enterprise annual contract"
  Assets:Bank:Mercury:Checking          120,000.00 USD
  Liabilities:DeferredRevenue          -120,000.00 USD

; Recognize monthly (1/12)
2026-01-31 * "BigCo" "Revenue recognition - January"
  Liabilities:DeferredRevenue            10,000.00 USD
  Income:Revenue:MRR:Enterprise         -10,000.00 USD
```

### Fundraising

```beancount
2026-01-01 open Equity:Investment:Seed          USD
2026-01-01 open Equity:Investment:SeriesA       USD

; Seed round
2026-01-15 * "Sequoia" "Seed investment"
  round: "Seed"
  valuation: "10M pre"
  Assets:Bank:Mercury:Checking        2,000,000.00 USD
  Equity:Investment:Seed

; Track SAFE notes
2026-01-01 open Liabilities:SAFE:YC             USD

2026-02-01 * "Y Combinator" "SAFE note"
  cap: "20M"
  discount: "0%"
  Liabilities:SAFE:YC                   500,000.00 USD
  Assets:Bank:Mercury:Checking          500,000.00 USD
```

### Payroll

```beancount
2026-01-01 open Expenses:Payroll:Salaries       USD
2026-01-01 open Expenses:Payroll:Benefits       USD
2026-01-01 open Expenses:Payroll:Taxes          USD
2026-01-01 open Liabilities:Payables:Payroll    USD

; Full payroll entry
2026-01-31 * "Gusto" "January payroll"
  Expenses:Payroll:Salaries              50,000.00 USD
  Expenses:Payroll:Benefits               5,000.00 USD
  Expenses:Payroll:Taxes                  7,500.00 USD
  Assets:Bank:Mercury:Checking          -62,500.00 USD
```

### Runway Tracking

```beancount
; Use balance assertions to track runway
2026-01-31 balance Assets:Bank:Mercury:Checking  500,000.00 USD
2026-02-28 balance Assets:Bank:Mercury:Checking  450,000.00 USD
; Burn rate: $50K/month → 9 months runway
```

---

## Balance Assertions

Verify your books match reality:

```beancount
; Assert balance on specific date
2026-01-31 balance Assets:Bank:Mercury:Checking  125,000.00 USD

; Pad to reconcile discrepancies
2026-01-15 pad Assets:Bank:Mercury:Checking Expenses:Adjustments

; Assert after pad
2026-01-31 balance Assets:Bank:Mercury:Checking  125,000.00 USD
```

---

## Python Automation

### Read Ledger Programmatically

```python
#!/usr/bin/env python3
"""Beancount automation script."""

from beancount import loader
from beancount.core import data
from beancount.query import query

# Load ledger
entries, errors, options = loader.load_file('ledger.beancount')

# Handle errors
if errors:
    for error in errors:
        print(f"Error: {error}")

# Query for MRR
result_types, result_rows = query.run_query(
    entries, options,
    "SELECT month, sum(position) WHERE account ~ 'Income:Revenue:MRR' GROUP BY month"
)

print("Monthly MRR:")
for row in result_rows:
    print(f"  {row[0]}: {row[1]}")
```

### Generate Transactions

```python
#!/usr/bin/env python3
"""Generate Stripe transactions from CSV."""

import csv
from datetime import datetime

def generate_stripe_entries(csv_path):
    """Convert Stripe export to Beancount."""
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = datetime.strptime(row['created'], '%Y-%m-%d').strftime('%Y-%m-%d')
            amount = float(row['amount']) / 100  # cents to dollars
            fee = float(row['fee']) / 100
            net = amount - fee
            
            print(f'{date} * "Stripe" "{row["description"]}"')
            print(f'  stripe_id: "{row["id"]}"')
            print(f'  Assets:Bank:Mercury:Checking  {net:.2f} USD')
            print(f'  Expenses:Fees:Stripe          {fee:.2f} USD')
            print(f'  Income:Revenue:MRR           -{amount:.2f} USD')
            print()

if __name__ == '__main__':
    generate_stripe_entries('stripe_export.csv')
```

### Monthly Close Script

```python
#!/usr/bin/env python3
"""Monthly close automation."""

from beancount import loader
from beancount.query import query
from datetime import date

def monthly_close(ledger_path, month):
    """Generate monthly close report."""
    entries, errors, options = loader.load_file(ledger_path)
    
    # Revenue
    _, revenue = query.run_query(entries, options, f"""
        SELECT sum(position) WHERE account ~ 'Income:Revenue' AND month = {month}
    """)
    
    # Expenses
    _, expenses = query.run_query(entries, options, f"""
        SELECT sum(position) WHERE account ~ 'Expenses' AND month = {month}
    """)
    
    # Cash position
    _, cash = query.run_query(entries, options, """
        SELECT sum(position) WHERE account ~ 'Assets:Bank'
    """)
    
    print(f"=== Monthly Close: {month} ===")
    print(f"Revenue:  {revenue[0][0] if revenue else 0}")
    print(f"Expenses: {expenses[0][0] if expenses else 0}")
    print(f"Net:      {(revenue[0][0] or 0) - (expenses[0][0] or 0)}")
    print(f"Cash:     {cash[0][0] if cash else 0}")

if __name__ == '__main__':
    monthly_close('ledger.beancount', '2026-01')
```

---

## File Organization

### Recommended Structure

```
finance/
├── ledger.beancount           # Main file (includes all)
├── accounts.beancount         # Account definitions
├── commodities.beancount      # Currencies, stocks
├── prices.beancount           # Price history
├── 2026/
│   ├── 01-january.beancount
│   ├── 02-february.beancount
│   └── ...
├── importers/
│   ├── stripe.py              # Stripe CSV importer
│   ├── mercury.py             # Mercury bank importer
│   └── amex.py                # Amex importer
├── documents/
│   ├── invoices/
│   └── receipts/
└── reports/
    └── monthly/
```

### Main Ledger Template

```beancount
; ledger.beancount
; MeshGuard Financial Ledger

option "title" "MeshGuard Finances"
option "operating_currency" "USD"
option "booking_method" "FIFO"

; Core definitions
include "accounts.beancount"
include "commodities.beancount"

; Transaction files
include "2026/01-january.beancount"
include "2026/02-february.beancount"

; Price history
include "prices.beancount"
```

---

## Common Reports for Startups

### Investor Update Metrics

```bash
# Total revenue this quarter
bean-query ledger.beancount "
  SELECT sum(position) as revenue
  WHERE account ~ 'Income:Revenue' 
    AND date >= 2026-01-01 AND date < 2026-04-01
"

# Burn rate (average monthly expenses)
bean-query ledger.beancount "
  SELECT month, sum(position) as expenses
  WHERE account ~ 'Expenses'
  GROUP BY month
  ORDER BY month DESC
  LIMIT 3
"

# Current runway
bean-query ledger.beancount "
  SELECT sum(position) as cash
  WHERE account ~ 'Assets:Bank'
"
```

### Board Deck Data

```bash
# MRR by tier
bean-query ledger.beancount "
  SELECT root(account, 4) as tier, sum(position) as mrr
  WHERE account ~ 'Income:Revenue:MRR' AND month = 2026-01
  GROUP BY tier
"

# Top expenses
bean-query ledger.beancount "
  SELECT root(account, 2) as category, sum(position) as total
  WHERE account ~ 'Expenses' AND month = 2026-01
  GROUP BY category
  ORDER BY total DESC
  LIMIT 10
"
```

---

## Integration with CRM (Twenty)

Link financial data with CRM opportunities:

```beancount
; Tag transactions with CRM opportunity ID
2026-01-15 * "Acme Corp" "Professional tier - closed won"
  crm_opportunity: "opp-12345"
  crm_company: "acme-corp"
  Assets:Bank:Mercury:Checking           10,000.00 USD
  Income:Revenue:MRR:Professional
```

Query linked transactions:

```bash
bean-query ledger.beancount "
  SELECT date, payee, narration, position, crm_opportunity
  WHERE crm_opportunity IS NOT NULL
  ORDER BY date DESC
"
```

---

## Tips & Best Practices

1. **Validate often**: Run `bean-check` after every edit
2. **Use balance assertions**: Monthly bank reconciliation catches errors
3. **Tag everything**: Tags make filtering and reporting easy
4. **Link related transactions**: Use `^link-name` to connect refunds, adjustments
5. **Automate imports**: Write Python importers for bank/Stripe data
6. **Keep history**: Never delete transactions, use adjustments
7. **Document decisions**: Use comments for accounting policy notes

---

## Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `Unbalanced transaction` | Amounts don't sum to zero | Check arithmetic, add missing leg |
| `Invalid account` | Account not opened | Add `open` directive |
| `Balance assertion failed` | Book balance ≠ asserted | Reconcile, add pad if needed |
| `Duplicate entry` | Same transaction twice | Remove duplicate |

---

## Resources

- [Beancount Documentation](https://beancount.github.io/docs/)
- [Beancount Query Language](https://beancount.github.io/docs/beancount_query_language.html)
- [Fava Documentation](https://beancount.github.io/fava/)
- [Plain Text Accounting](https://plaintextaccounting.org/)
