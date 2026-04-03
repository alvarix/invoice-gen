-- Service agreement debit: hours deducted from billable total before tax
alter table invoices add column debit_hours numeric not null default 0;
alter table invoices add column debit_amount numeric not null default 0;
