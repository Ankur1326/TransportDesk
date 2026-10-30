# LHC Phase 2B — Profit-per-trip report, Vehicles & Drivers

Depends on: Phase 2A not required; needs Phase 1 contracts with `items[].consignmentId`.

Scope
1. Profit report: per contract, LR freight earned (`Consignment.charges.freight` of linked LRs) minus `grossHire`/`netPayable`. Aggregation in `lib/lorry-hire/profit.ts`, API `GET /api/admin/lorry-hires/profit` (date, supplier, vehicle filters), page `/admin/reports/trip-profit`.
2. Vehicles page: aggregate LHC by `truck.vehicleNumber` (trips, last driver, owner, last hired, total hire cost). No new collection.
3. Drivers page: aggregate by driver mobile/name (trips, vehicles used, last trip).
4. Tests for the profit maths (multiple LRs, missing freight, cancelled excluded).
