-- TimeGate backend schema (Flyway V1). Postgres ENUMs mapped to VARCHAR for JPA compatibility.
-- Derived from schema_postgresql.sql.

-- =====================================================================
-- QR Attendance & Payroll Management System (TimeGate)
-- Database schema (DDL) - PostgreSQL 14+
-- Generated from the data model. Version 1.0 / 2026-06-05
-- =====================================================================

BEGIN;

-- ---------- ENUM types ----------

-- Departments / Bo'limlar
CREATE TABLE departments (
    id BIGSERIAL,
    name VARCHAR(150),
    manager_id BIGINT,
    created_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Positions / Lavozimlar
CREATE TABLE positions (
    id BIGSERIAL,
    title VARCHAR(150),
    PRIMARY KEY (id)
);

-- Employees / Xodimlar
CREATE TABLE employees (
    id BIGSERIAL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    department_id BIGINT,
    position_id BIGINT,
    employment_type VARCHAR(30),
    payroll_model VARCHAR(30),
    qr_token VARCHAR(128) UNIQUE,
    phone VARCHAR(30),
    email VARCHAR(120),
    hire_date DATE,
    status VARCHAR(30),
    created_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Roles / Rollar
CREATE TABLE roles (
    id BIGSERIAL,
    name VARCHAR(50) UNIQUE,
    description VARCHAR(200),
    PRIMARY KEY (id)
);

-- Permissions / Ruxsatlar
CREATE TABLE permissions (
    id BIGSERIAL,
    code VARCHAR(80) UNIQUE,
    description VARCHAR(200),
    PRIMARY KEY (id)
);

-- Role-permission (M:N) / Rol-ruxsat (M:N)
CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- Users / Foydalanuvchilar
CREATE TABLE users (
    id BIGSERIAL,
    employee_id BIGINT,
    login VARCHAR(80) UNIQUE,
    password_hash VARCHAR(255),
    role_id BIGINT,
    status VARCHAR(30),
    last_login_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Shifts / Smenalar
CREATE TABLE shifts (
    id BIGSERIAL,
    name VARCHAR(100),
    start_time TIME,
    end_time TIME,
    break_minutes INT,
    grace_in_minutes INT,
    grace_out_minutes INT,
    overtime_after_min INT,
    is_overnight BOOLEAN,
    PRIMARY KEY (id)
);

-- Shift days / Smena kunlari
CREATE TABLE shift_days (
    id BIGSERIAL,
    shift_id BIGINT,
    weekday SMALLINT,
    PRIMARY KEY (id)
);

-- Employee-shift assignment / Xodim-smena tayinlash
CREATE TABLE employee_shifts (
    id BIGSERIAL,
    employee_id BIGINT,
    shift_id BIGINT,
    valid_from DATE,
    valid_to DATE,
    PRIMARY KEY (id)
);

-- Work calendar / Ish kalendari
CREATE TABLE work_calendar (
    id BIGSERIAL,
    calendar_date DATE UNIQUE,
    day_type VARCHAR(30),
    description VARCHAR(150),
    PRIMARY KEY (id)
);

-- Pay rates (history) / Stavkalar (tarix)
CREATE TABLE pay_rates (
    id BIGSERIAL,
    employee_id BIGINT,
    model VARCHAR(30),
    hourly_rate NUMERIC(12,2),
    monthly_salary NUMERIC(12,2),
    shift_rate NUMERIC(12,2),
    currency VARCHAR(3),
    valid_from DATE,
    valid_to DATE,
    PRIMARY KEY (id)
);

-- Attendance (daily aggregate) / Davomat (kunlik yig'ma)
CREATE TABLE attendance (
    id BIGSERIAL,
    employee_id BIGINT,
    shift_id BIGINT,
    work_date DATE,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    worked_minutes INT,
    late_minutes INT,
    early_leave_minutes INT,
    overtime_minutes INT,
    status VARCHAR(30),
    corrected_by BIGINT,
    note VARCHAR(255),
    PRIMARY KEY (id)
);

-- Attendance events (raw scans) / Davomat hodisalari (xom skan)
CREATE TABLE attendance_events (
    id BIGSERIAL,
    employee_id BIGINT,
    attendance_id BIGINT,
    scanned_at TIMESTAMPTZ,
    event_type VARCHAR(30),
    device_id VARCHAR(80),
    geo_lat NUMERIC(9,6),
    geo_lng NUMERIC(9,6),
    is_valid BOOLEAN,
    PRIMARY KEY (id)
);

-- Payroll periods / Ish haqi davrlari
CREATE TABLE payroll_periods (
    id BIGSERIAL,
    name VARCHAR(80),
    start_date DATE,
    end_date DATE,
    status VARCHAR(30),
    closed_by BIGINT,
    closed_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Payrolls (employee/period) / Ish haqi (xodim/davr)
CREATE TABLE payrolls (
    id BIGSERIAL,
    period_id BIGINT,
    employee_id BIGINT,
    model VARCHAR(30),
    worked_hours NUMERIC(8,2),
    worked_shifts INT,
    gross NUMERIC(14,2),
    total_bonus NUMERIC(14,2),
    total_fine NUMERIC(14,2),
    total_deduction NUMERIC(14,2),
    net NUMERIC(14,2),
    currency VARCHAR(3),
    status VARCHAR(30),
    generated_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Bonus/fine rules / Bonus/jarima qoidalari
CREATE TABLE payroll_rules (
    id BIGSERIAL,
    name VARCHAR(120),
    type VARCHAR(30),
    trigger VARCHAR(30),
    amount_type VARCHAR(30),
    amount_value NUMERIC(12,2),
    is_active BOOLEAN,
    PRIMARY KEY (id)
);

-- Payroll adjustments / Ish haqi tuzatmalari
CREATE TABLE payroll_adjustments (
    id BIGSERIAL,
    payroll_id BIGINT,
    rule_id BIGINT,
    type VARCHAR(30),
    amount NUMERIC(14,2),
    reason VARCHAR(255),
    created_by BIGINT,
    created_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Leave types / Ta'til turlari
CREATE TABLE leave_types (
    id BIGSERIAL,
    name VARCHAR(100),
    is_paid BOOLEAN,
    default_days INT,
    PRIMARY KEY (id)
);

-- Leave requests / Ta'til so'rovlari
CREATE TABLE leave_requests (
    id BIGSERIAL,
    employee_id BIGINT,
    leave_type_id BIGINT,
    date_from DATE,
    date_to DATE,
    days NUMERIC(5,1),
    reason VARCHAR(255),
    status VARCHAR(30),
    approver_id BIGINT,
    decided_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Leave balances / Ta'til balansi
CREATE TABLE leave_balances (
    id BIGSERIAL,
    employee_id BIGINT,
    leave_type_id BIGINT,
    year SMALLINT,
    entitled_days NUMERIC(5,1),
    used_days NUMERIC(5,1),
    PRIMARY KEY (id)
);

-- Notifications / Bildirishnomalar
CREATE TABLE notifications (
    id BIGSERIAL,
    user_id BIGINT,
    channel VARCHAR(30),
    title VARCHAR(150),
    body TEXT,
    is_read BOOLEAN,
    sent_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- Audit log / Audit jurnali
CREATE TABLE audit_logs (
    id BIGSERIAL,
    user_id BIGINT,
    action VARCHAR(80),
    entity_type VARCHAR(80),
    entity_id BIGINT,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ,
    PRIMARY KEY (id)
);

-- ---------- Foreign keys ----------
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager_id FOREIGN KEY (manager_id) REFERENCES employees (id) ON DELETE SET NULL;
ALTER TABLE employees ADD CONSTRAINT fk_employees_department_id FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT;
ALTER TABLE employees ADD CONSTRAINT fk_employees_position_id FOREIGN KEY (position_id) REFERENCES positions (id) ON DELETE RESTRICT;
ALTER TABLE users ADD CONSTRAINT fk_users_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
ALTER TABLE users ADD CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE;
ALTER TABLE shift_days ADD CONSTRAINT fk_shift_days_shift_id FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE CASCADE;
ALTER TABLE employee_shifts ADD CONSTRAINT fk_employee_shifts_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
ALTER TABLE employee_shifts ADD CONSTRAINT fk_employee_shifts_shift_id FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE RESTRICT;
ALTER TABLE pay_rates ADD CONSTRAINT fk_pay_rates_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_shift_id FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE SET NULL;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_corrected_by FOREIGN KEY (corrected_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE attendance_events ADD CONSTRAINT fk_attendance_events_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
ALTER TABLE attendance_events ADD CONSTRAINT fk_attendance_events_attendance_id FOREIGN KEY (attendance_id) REFERENCES attendance (id) ON DELETE SET NULL;
ALTER TABLE payroll_periods ADD CONSTRAINT fk_payroll_periods_closed_by FOREIGN KEY (closed_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE payrolls ADD CONSTRAINT fk_payrolls_period_id FOREIGN KEY (period_id) REFERENCES payroll_periods (id) ON DELETE RESTRICT;
ALTER TABLE payrolls ADD CONSTRAINT fk_payrolls_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT;
ALTER TABLE payroll_adjustments ADD CONSTRAINT fk_payroll_adjustments_payroll_id FOREIGN KEY (payroll_id) REFERENCES payrolls (id) ON DELETE CASCADE;
ALTER TABLE payroll_adjustments ADD CONSTRAINT fk_payroll_adjustments_rule_id FOREIGN KEY (rule_id) REFERENCES payroll_rules (id) ON DELETE SET NULL;
ALTER TABLE payroll_adjustments ADD CONSTRAINT fk_payroll_adjustments_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_leave_type_id FOREIGN KEY (leave_type_id) REFERENCES leave_types (id) ON DELETE RESTRICT;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_approver_id FOREIGN KEY (approver_id) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE leave_balances ADD CONSTRAINT fk_leave_balances_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
ALTER TABLE leave_balances ADD CONSTRAINT fk_leave_balances_leave_type_id FOREIGN KEY (leave_type_id) REFERENCES leave_types (id) ON DELETE RESTRICT;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

-- ---------- Indexes ----------
CREATE INDEX idx_attendance_emp_date ON attendance (employee_id, work_date);
CREATE UNIQUE INDEX uq_attendance_emp_date ON attendance (employee_id, work_date);
CREATE INDEX idx_att_events_emp_time ON attendance_events (employee_id, scanned_at);
CREATE INDEX idx_payrolls_period ON payrolls (period_id);
CREATE UNIQUE INDEX uq_payroll_emp_period ON payrolls (period_id, employee_id);
CREATE INDEX idx_adjustments_payroll ON payroll_adjustments (payroll_id);
CREATE INDEX idx_leave_req_emp ON leave_requests (employee_id, status);
CREATE UNIQUE INDEX uq_emp_shift_period ON employee_shifts (employee_id, shift_id, valid_from);
CREATE UNIQUE INDEX uq_role_perm ON role_permissions (role_id, permission_id);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);

-- ---------- Check constraints (examples) ----------
ALTER TABLE shifts ADD CONSTRAINT chk_break_nonneg CHECK (break_minutes >= 0);
ALTER TABLE attendance ADD CONSTRAINT chk_worked_nonneg CHECK (worked_minutes >= 0);
ALTER TABLE leave_requests ADD CONSTRAINT chk_dates CHECK (date_to >= date_from);
ALTER TABLE pay_rates ADD CONSTRAINT chk_rate_dates CHECK (valid_to IS NULL OR valid_to >= valid_from);

COMMIT;
