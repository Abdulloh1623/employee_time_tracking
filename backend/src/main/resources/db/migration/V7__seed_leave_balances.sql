-- TimeGate V7: seed 2026 leave entitlements (Annual 21d, Sick 10d) for every
-- employee, so the self-service "leave balance" view shows meaningful data.
-- Idempotent: skips any (employee, type, year) row that already exists.
INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days)
SELECT e.id, lt.id, 2026,
       CASE lt.id WHEN 1 THEN 21.0 WHEN 2 THEN 10.0 END,
       0.0
FROM employees e
CROSS JOIN leave_types lt
WHERE lt.id IN (1, 2)
  AND NOT EXISTS (
    SELECT 1 FROM leave_balances b
    WHERE b.employee_id = e.id AND b.leave_type_id = lt.id AND b.year = 2026
  );
