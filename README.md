# LedgerLens · E-commerce Finance

**Live demo:** https://ledgerlens-wine.vercel.app

A working prototype of an e-commerce financial management system — business documents drive automatic voucher generation, dimensions tag every journal line, and any dashboard number drills down to its source document.

## Why I built this

In cross-border e-commerce, business data (orders, logistics, returns) and book data live in separate worlds. Month-end means humans reconciling spreadsheets with inconsistent definitions. I built LedgerLens to demonstrate how a document-driven ledger closes that gap.

## Key product decisions

1. **Documents → vouchers, automatically.** Every business event (shipment, return, payment) generates a balanced journal entry via a rule engine. The same document never generates twice (idempotency on document + event type).
2. **Dimensions are first-class.** Every journal line carries BU / project / store / SKU / currency tags. New business units mean new tag values, not new tables — this is how the system scales without rebuilding.
3. **Unbalanced entries are rejected, not warned.** A journal that doesn't balance goes to an exception queue. In finance, a warning is a bug waiting to happen.
4. **Every number drills down.** Dashboard → voucher → source document in three clicks. If a CFO can't trace a number to its origin, the dashboard is decoration.

## What's inside

- **Voucher engine** — auto-generation from business events, manual adjustments, red-reversal with full audit chain
- **General ledger** — multi-entity, multi-currency, period close with checklist
- **Order finance** — B2C / B2B / returns, each with its own accounting logic
- **AR / AP** — aging, auto-matching, 3-way match for procurement
- **BI dashboard** — BU views, project ROI traceback with versioned snapshots

## Stack

React + Vite · Deployed on Vercel · Mock data (all figures are synthetic)

## Status

Prototype — built with Cursor over a weekend to validate the product model. Not production code, but the accounting logic (double-entry integrity, tag inheritance, reconciliation flow) reflects real financial-system design.
