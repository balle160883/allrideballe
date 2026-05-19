-- 1. Limpiar tablas de cobranza antiguas (si existen)
DROP TABLE IF EXISTS "cobranza_promesas" CASCADE;
DROP TABLE IF EXISTS "cobranza_interacciones" CASCADE;
DROP TABLE IF EXISTS "asignacion_gestores" CASCADE;
DROP TABLE IF EXISTS "asignacion_avales" CASCADE;
DROP TABLE IF EXISTS "prestamos_datos" CASCADE;
DROP TABLE IF EXISTS "socios_datos" CASCADE;
DROP TABLE IF EXISTS "ubicaciones_gestores" CASCADE;
DROP TABLE IF EXISTS "usuarios_gestor" CASCADE;

-- 2. Crear extensión para UUID si no existe (Omitido para evitar problemas de permisos, usando gen_random_uuid)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Crear tabla de usuarios con nuevos roles
CREATE TABLE "usuarios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "rol" VARCHAR(50) NOT NULL CHECK ("rol" IN ('admin_cliente', 'admin_proveedor', 'conductor', 'pasajero')),
    "identificador_tarjeta" VARCHAR(100), -- Para validar abordajes físicos sin app (QR/NFC)
    "gestor_code" VARCHAR(100) UNIQUE, -- Para mapeo compatible con lógica anterior (ej: 'CONDU01')
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Crear tabla de rutas
CREATE TABLE "rutas" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(255) NOT NULL,
    "origen" VARCHAR(255) NOT NULL,
    "destino" VARCHAR(255) NOT NULL,
    "paradas" JSONB NOT NULL, -- Lista ordenada de paradas [{nombre, latitud, longitud, orden}]
    "activo" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Crear tabla de vehículos
CREATE TABLE "vehiculos" (
    "id" SERIAL PRIMARY KEY,
    "patente" VARCHAR(50) UNIQUE NOT NULL,
    "modelo" VARCHAR(100) NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 42,
    "proveedor_nombre" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crear tabla de viajes (servicios programados)
CREATE TABLE "viajes" (
    "id" SERIAL PRIMARY KEY,
    "ruta_id" INTEGER REFERENCES "rutas"("id") ON DELETE CASCADE,
    "vehiculo_id" INTEGER REFERENCES "vehiculos"("id") ON DELETE SET NULL,
    "conductor_id" UUID REFERENCES "usuarios"("id") ON DELETE SET NULL,
    "fecha_hora_salida" TIMESTAMP NOT NULL,
    "estado" VARCHAR(50) NOT NULL CHECK ("estado" IN ('programado', 'en_ruta', 'completado', 'cancelado')) DEFAULT 'programado',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Crear tabla de reservas
CREATE TABLE "reservas" (
    "id" SERIAL PRIMARY KEY,
    "viaje_id" INTEGER REFERENCES "viajes"("id") ON DELETE CASCADE,
    "pasajero_id" UUID REFERENCES "usuarios"("id") ON DELETE CASCADE,
    "asiento_numero" INTEGER NOT NULL,
    "estado" VARCHAR(50) NOT NULL CHECK ("estado" IN ('reservado', 'abordado', 'no_abordado', 'cancelado')) DEFAULT 'reservado',
    "fecha_reserva" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("viaje_id", "asiento_numero"), -- Un asiento solo se reserva una vez por viaje
    UNIQUE("viaje_id", "pasajero_id") -- Un pasajero solo tiene una reserva por viaje
);

-- 8. Crear tabla de ubicaciones de flota (GPS en tiempo real)
CREATE TABLE "ubicaciones_flota" (
    "id" SERIAL PRIMARY KEY,
    "viaje_id" INTEGER REFERENCES "viajes"("id") ON DELETE CASCADE,
    "latitud" NUMERIC(10, 8) NOT NULL,
    "longitud" NUMERIC(11, 8) NOT NULL,
    "velocidad" NUMERIC(5, 2),
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Crear tabla de alertas de viaje
CREATE TABLE "alertas_viaje" (
    "id" SERIAL PRIMARY KEY,
    "viaje_id" INTEGER REFERENCES "viajes"("id") ON DELETE CASCADE,
    "tipo" VARCHAR(50) NOT NULL CHECK ("tipo" IN ('desvio_ruta', 'atraso_proyectado', 'inicio_tardio', 'no_abordado')),
    "descripcion" TEXT NOT NULL,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "resuelta" BOOLEAN DEFAULT FALSE
);

-- 10. Crear tabla de rentas mensuales
CREATE TABLE IF NOT EXISTS "rentas_mensuales" (
    "cliente_email" VARCHAR(255) PRIMARY KEY,
    "status" VARCHAR(50) NOT NULL,
    "monto" NUMERIC(10, 2) NOT NULL DEFAULT 0,
    "fecha_ultimo_pago" VARCHAR(100),
    "proximo_vencimiento" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- SEED DATA (DATOS INICIALES DE PRUEBA)
-- -------------------------------------------------------------

-- O. Insertar rentas mensuales de prueba
INSERT INTO "rentas_mensuales" ("cliente_email", "status", "monto", "fecha_ultimo_pago", "proximo_vencimiento") VALUES
('admin@allride.com', 'activa', 450.00, '2026-05-01', '2026-06-01')
ON CONFLICT (cliente_email) DO NOTHING;

-- 1. Insertar usuarios (contraseña en texto plano 'password' para pruebas rápidas de compatibilidad)
INSERT INTO "usuarios" ("id", "email", "password_hash", "nombre", "rol", "identificador_tarjeta", "gestor_code") VALUES
('1a111111-1111-1111-1111-111111111111', 'admin@allride.com', 'password', 'Administrador Cliente', 'admin_cliente', NULL, NULL),
('2b222222-2222-2222-2222-222222222222', 'conductor1@allride.com', 'password', 'Juan Pérez (Conductor)', 'conductor', NULL, 'CONDU01'),
('3c3c3c3c-3c3c-3c3c-3c3c-3c3c3c3c3c3c', 'pasajero1@allride.com', 'password', 'María Gómez (Pasajero)', 'pasajero', 'QR-9988776655', NULL),
('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', 'ing.ballesteros16@gmail.com', 'Seguridad2026@', 'Administrador Global', 'admin_cliente', NULL, NULL);

-- 2. Insertar rutas con paradas GeoJSON/JSON
INSERT INTO "rutas" ("id", "nombre", "origen", "destino", "paradas") VALUES
(1, 'Ruta Central → Planta Norte', 'Plaza Central', 'Planta Industrial Norte', '[
  {"orden": 1, "nombre": "Plaza Central", "latitud": 20.6736, "longitud": -103.344},
  {"orden": 2, "nombre": "Parada Av. Patria", "latitud": 20.7015, "longitud": -103.382},
  {"orden": 3, "nombre": "Planta Industrial Norte", "latitud": 20.753, "longitud": -103.415}
]'),
(2, 'Planta Norte → Ruta Sur', 'Planta Industrial Norte', 'Plaza del Sur', '[
  {"orden": 1, "nombre": "Planta Industrial Norte", "latitud": 20.753, "longitud": -103.415},
  {"orden": 2, "nombre": "Parada Periférico", "latitud": 20.612, "longitud": -103.315},
  {"orden": 3, "nombre": "Plaza del Sur", "latitud": 20.584, "longitud": -103.322}
]');

-- 3. Insertar vehículos
INSERT INTO "vehiculos" ("id", "patente", "modelo", "capacidad", "proveedor_nombre") VALUES
(1, 'AB-123-CD', 'Mercedes-Benz Sprinter (Vans)', 19, 'Transportes del Valle'),
(2, 'XY-987-ZZ', 'Volvo Bus (Grande)', 42, 'Transportes del Valle');

-- 4. Insertar viajes (uno programado para hoy)
INSERT INTO "viajes" ("id", "ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida", "estado") VALUES
(1, 1, 2, '2b222222-2222-2222-2222-222222222222', NOW() + INTERVAL '1 hour', 'programado'),
(2, 2, 1, '2b222222-2222-2222-2222-222222222222', NOW() + INTERVAL '4 hours', 'programado');

-- 5. Insertar reservas de asientos
INSERT INTO "reservas" ("viaje_id", "pasajero_id", "asiento_numero", "estado") VALUES
(1, '3c3c3c3c-3c3c-3c3c-3c3c-3c3c3c3c3c3c', 14, 'reservado');
