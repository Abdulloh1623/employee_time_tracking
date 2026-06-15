-- TimeGate V5: dedicated 'checker' role for QR scanning (check-in/out) only.
-- The scanner is a front-line task. Admins manage; checkers scan.

-- New permission: scan QR for attendance
INSERT INTO permissions (id, code, description) VALUES
  (9, 'attendance.scan', 'Scan QR for check-in/out');
SELECT setval(pg_get_serial_sequence('permissions','id'), 9);

-- New role: checker (scan-only)
INSERT INTO roles (id, name, description) VALUES
  (6, 'checker', 'Check-in/out scanner operator');
SELECT setval(pg_get_serial_sequence('roles','id'), 6);

-- checker can ONLY scan; super_admin keeps scan too (web kiosk stays available for admin)
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (6, 9),
  (1, 9);

-- Default checker account: checker / checker123  (CHANGE IN PRODUCTION)
INSERT INTO users (id, employee_id, login, password_hash, role_id, status) VALUES
  (3, NULL, 'checker', '$2a$10$SBxSApxYxvZh5tZJvn0OJOsBmBQdiEY.txL7UJ5J5VMUqAfFvqta2', 6, 'active');
SELECT setval(pg_get_serial_sequence('users','id'), 3);
