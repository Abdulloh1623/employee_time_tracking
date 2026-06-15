-- TimeGate V6: a self-service employee account for the mobile app.
-- Linked to employee #1 (Valiyev Ali). Login: ali / ali123  (CHANGE IN PRODUCTION)
INSERT INTO users (id, employee_id, login, password_hash, role_id, status) VALUES
  (4, 1, 'ali', '$2a$10$aJTxAoIVb.mwgq4J965o8e3A5CY9GK22O2UYTI2482emUGE2Hk4Fa', 5, 'active');
SELECT setval(pg_get_serial_sequence('users','id'), 4);
