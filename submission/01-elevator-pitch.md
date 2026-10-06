# Lookthrough.systems

Private funds need to share material events without giving every investor the same sensitive book. Lookthrough gives a GP and fund administrator one permissioned workflow: prepare standard and enhanced views, review them independently, publish one scoped receipt per investor, record the valuation watermark, and reserve a partial capital position while the valuation is fresh.

The product is for GPs, fund administrators, LPs with different information rights and auditors. Canton is the operating boundary: Daml choices encode the reviewer separation, LP consent, valuation freshness and party-scoped disclosure receipts. The local workspace is runnable now; the server-side JSON Ledger API adapter executes the full five-party path against a Canton participant, and the same command is ready to run against the shared Season 3 DevNet participant.
