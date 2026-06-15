-- TimeGate seed data (Flyway V2)
-- Default passwords: admin/admin123 , hr/hr12345  (CHANGE IN PRODUCTION)

-- ---------- Roles ----------
INSERT INTO roles (id, name, description) VALUES
  (1, 'super_admin', 'Super administrator'),
  (2, 'hr_manager',  'HR manager'),
  (3, 'accountant',  'Accountant'),
  (4, 'manager',     'Department manager'),
  (5, 'employee',    'Employee');
SELECT setval(pg_get_serial_sequence('roles','id'), 5);

-- ---------- Permissions ----------
INSERT INTO permissions (id, code, description) VALUES
  (1, 'employees.read',   'View employees'),
  (2, 'employees.write',  'Manage employees'),
  (3, 'shifts.write',     'Manage shifts'),
  (4, 'attendance.read',  'View attendance'),
  (5, 'attendance.write', 'Correct attendance'),
  (6, 'payroll.run',      'Run payroll'),
  (7, 'reports.read',     'View reports'),
  (8, 'admin.config',     'System configuration');
SELECT setval(pg_get_serial_sequence('permissions','id'), 8);

-- super_admin gets all; hr_manager gets employee/shift/attendance/reports
INSERT INTO role_permissions (role_id, permission_id)
  SELECT 1, id FROM permissions;
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,1),(2,2),(2,3),(2,4),(2,5),(2,7),
  (3,1),(3,4),(3,6),(3,7),
  (4,1),(4,4),(4,7);

-- ---------- Departments & positions ----------
INSERT INTO departments (id, name, created_at) VALUES
  (1, 'IT', now()),
  (2, 'HR', now()),
  (3, 'Finance', now());
SELECT setval(pg_get_serial_sequence('departments','id'), 3);

INSERT INTO positions (id, title) VALUES
  (1, 'Software Engineer'),
  (2, 'HR Specialist'),
  (3, 'Accountant'),
  (4, 'Department Manager');
SELECT setval(pg_get_serial_sequence('positions','id'), 4);

-- ---------- Shift (day 09:00-18:00, Mon-Fri) ----------
INSERT INTO shifts (id, name, start_time, end_time, break_minutes, grace_in_minutes, grace_out_minutes, overtime_after_min, is_overnight) VALUES
  (1, 'Day 09-18', '09:00', '18:00', 60, 10, 10, 540, false);
SELECT setval(pg_get_serial_sequence('shifts','id'), 1);

INSERT INTO shift_days (shift_id, weekday) VALUES (1,1),(1,2),(1,3),(1,4),(1,5);

-- ---------- Employees ----------
INSERT INTO employees (id, first_name, last_name, department_id, position_id, employment_type, payroll_model, qr_token, hire_date, status, created_at) VALUES
  (1, 'Ali',  'Valiyev',  1, 1, 'full_time', 'hourly',        'TGV-emp001', DATE '2026-01-15', 'active', now()),
  (2, 'Lola', 'Karimova', 2, 2, 'full_time', 'fixed_monthly', 'TGV-emp002', DATE '2026-02-01', 'active', now()),
  (3, 'Bek',  'Toshev',   3, 3, 'full_time', 'fixed_monthly', 'TGV-emp003', DATE '2026-03-10', 'active', now());
SELECT setval(pg_get_serial_sequence('employees','id'), 3);

INSERT INTO employee_shifts (employee_id, shift_id, valid_from) VALUES (1,1,DATE '2026-01-15'),(2,1,DATE '2026-02-01'),(3,1,DATE '2026-03-10');

INSERT INTO pay_rates (employee_id, model, hourly_rate, monthly_salary, currency, valid_from) VALUES
  (1, 'hourly',        20000, NULL,    'UZS', DATE '2026-01-15'),
  (2, 'fixed_monthly', NULL,  5000000, 'UZS', DATE '2026-02-01'),
  (3, 'fixed_monthly', NULL,  6000000, 'UZS', DATE '2026-03-10');

-- ---------- Users ----------
-- admin / admin123
INSERT INTO users (id, employee_id, login, password_hash, role_id, status) VALUES
  (1, NULL, 'admin', '$2b$10$spIfGjchnyF7A4PkcqsFBOH2aPAyOYsFicmvz0ObdhRtdGeyxiaYC', 1, 'active'),
  (2, 2,    'hr',    '$2b$10$GP5mw38v0kzxDMn8A8XrduA/caM2YcClOgcQN7aHwtLKAIYsygvHC', 2, 'active');
SELECT setval(pg_get_serial_sequence('users','id'), 2);

-- ---------- Leave types ----------
INSERT INTO leave_types (id, name, is_paid, default_days) VALUES
  (1, 'Annual', true, 21),
  (2, 'Sick', true, 10),
  (3, 'Unpaid', false, 0);
SELECT setval(pg_get_serial_sequence('leave_types','id'), 3);
