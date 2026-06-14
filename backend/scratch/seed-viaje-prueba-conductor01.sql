-- ==============================================
-- SCRIPT: Crear ruta y viaje de prueba para CONDU01
-- Destino: Flex Norte, Jalisco
-- ==============================================

-- 1. Primero, verificar que existe el conductor CONDU01
-- Si no existe, lo creamos (contraseña: Conductor2026@)
INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "gestor_code")
VALUES (
  'conductor1@allride.com',
  '$2b$10$K0e8z7W5q5q5q5q5q5q5quuL8X8X8X8X8X8X8X8X8X8X8X8X8X8X',
  'CONDU01',
  'conductor',
  'CONDU01'
)
ON CONFLICT ("email") DO NOTHING;

-- Obtener el ID del conductor
WITH conductor AS (
  SELECT id FROM "usuarios" WHERE email = 'conductor1@allride.com' LIMIT 1
),

-- 2. Crear vehículo de prueba (si no existe)
vehiculo AS (
  INSERT INTO "vehiculos" ("patente", "modelo", "capacidad", "proveedor_nombre")
  VALUES ('JAL-123-AB', 'Mercedes-Benz Sprinter', 15, 'FleetPro')
  ON CONFLICT ("patente") DO NOTHING
  RETURNING id
),

-- 3. Crear la ruta hacia Flex Norte, Jalisco
ruta AS (
  INSERT INTO "rutas" ("nombre", "origen", "destino", "paradas", "activo")
  VALUES (
    'Ruta Centro → Flex Norte',
    'Centro Histórico, Guadalajara',
    'Flex Norte, Tlaquepaque, Jalisco',
    '[
      {"orden": 1, "nombre": "Parada 1 - Centro Histórico", "latitud": 20.6736, "longitud": -103.3496},
      {"orden": 2, "nombre": "Parada 2 - Av. Vallarta", "latitud": 20.6745, "longitud": -103.3701},
      {"orden": 3, "nombre": "Parada 3 - Plaza del Sol", "latitud": 20.6789, "longitud": -103.3850},
      {"orden": 4, "nombre": "Parada 4 - Periférico Norte", "latitud": 20.7102, "longitud": -103.3950},
      {"orden": 5, "nombre": "Parada 5 - Industrial Norte", "latitud": 20.7250, "longitud": -103.3800},
      {"orden": 6, "nombre": "Flex Norte, Tlaquepaque", "latitud": 20.7350, "longitud": -103.3650}
    ]'::jsonb,
    true
  )
  ON CONFLICT ("nombre") DO NOTHING
  RETURNING id
)

-- 4. Crear el viaje de prueba (programado para mañana a las 7:00 AM)
INSERT INTO "viajes" ("ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida", "estado")
SELECT 
  ruta.id,
  COALESCE(vehiculo.id, (SELECT id FROM "vehiculos" LIMIT 1)),
  conductor.id,
  (NOW() + INTERVAL '1 day' + INTERVAL '7 hours')::TIMESTAMP,
  'programado'
FROM conductor, ruta
LEFT JOIN vehiculo ON true
ON CONFLICT DO NOTHING
RETURNING id, ruta_id, vehiculo_id, conductor_id, fecha_hora_salida;
