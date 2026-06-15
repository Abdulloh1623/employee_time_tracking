-- TimeGate payroll rules seed (Flyway V3)
-- Demonstration auto rules used by the calculation engine.

INSERT INTO payroll_rules (id, name, type, trigger, amount_type, amount_value, is_active) VALUES
  (1, 'Zero-lateness bonus', 'bonus', 'zero_lateness',   'fixed',      200000, true),
  (2, 'Lateness fine',       'fine', 'per_late_minute',  'per_minute', 500,    true);
SELECT setval(pg_get_serial_sequence('payroll_rules','id'), 2);
