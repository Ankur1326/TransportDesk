# LHC Phase 2A — Supplier ledger & statement

Depends on: Phase 1 `LorryHire` model (`settlement.netPayable`, embedded `payments[]`).

Scope
1. Pure builder `lib/lorry-hire/supplier-ledger.ts`: opening balance + hire (payable) + payments (paid), running balance, per-contract outstanding, ageing. Cancelled contracts are skipped. Money in paise.
2. Loader `lib/lorry-hire/load-supplier-ledger.ts` (company-scoped; matches by `supplier.supplierId`).
3. API `GET /api/admin/supplier/ledger/[id]?from&to&type&currentPage&itemsPerPage`.
4. UI `components/lorry-hire/SupplierLedgerPanel.tsx` (existing `Card`, `Badge`, `Pagination`, `FormInput`), opened from the Suppliers page.
5. Unit tests for the builder.

Out of scope (Phase 1 API work, still required): payments add/remove endpoints and the `Payment` mirror row (`ledgerPaymentId`). The ledger reads the contract's own `payments[]`, so it works without the mirror.

Sign convention: positive balance = we owe the supplier (payable).
