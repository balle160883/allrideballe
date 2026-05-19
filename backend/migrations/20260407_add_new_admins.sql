-- Migración para agregar nuevos usuarios administradores
-- Fecha: 2026-04-07

INSERT INTO usuarios_gestor (email, password_hash, gestor, rol)
VALUES 
    ('sergio.elizondo@allride.com', 'SergioVesta2026!', 'SERGIO ELIZONDO', 'admin'),
    ('ricardo.almaraz@allride.com', 'RicardoVesta2026!', 'RICARDO ALMARAZ', 'admin'),
    ('natalie.torres@allride.com', 'NatalieVesta2026!', 'NATALIE TORRES', 'admin')
ON CONFLICT (email) 
DO UPDATE SET 
    rol = 'admin', 
    password_hash = EXCLUDED.password_hash,
    gestor = EXCLUDED.gestor;
