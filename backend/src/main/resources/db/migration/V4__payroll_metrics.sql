-- TimeGate V4: richer payslip metrics + payroll index
-- Persist late/overtime/worked-days on each payroll so payslips can display them.

ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS late_minutes INT DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS overtime_minutes INT DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS worked_days INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls (employee_id);

-- early_leave is now a supported rule trigger (no schema change needed; trigger is VARCHAR)
