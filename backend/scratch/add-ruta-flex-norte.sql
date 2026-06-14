-- ==============================================
-- AGREGAR RUTA Y VIAJE DE PRUEBA: FLEX NORTE, JALISCO
-- ==============================================

-- 1. Actualizar el nombre del conductor para que sea CONDU01 (si no lo es ya)
UPDATE "usuarios"
SET "nombre" = 'CONDU01'
WHERE "email" = 'conductor1@allride.com';

-- 2. Agregar la nueva ruta hacia Flex Norte, Tlaquepaque, Jalisco
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
ON CONFLICT ("nombre") DO NOTHING;

-- 3. Obtener el ID de la ruta y del conductor
WITH ruta_insertada AS (
  SELECT id FROM "rutas" WHERE "nombre" = 'Ruta Centro → Flex Norte' LIMIT 1
),
conductor AS (
  SELECT id FROM "usuarios" WHERE "email" = 'conductor1@allride.com' LIMIT 1
),
vehiculo AS (
  SELECT id FROM "vehiculos" LIMIT 1
)

-- 4. Crear el viaje de prueba (mañana a las 7:00 AM)
INSERT INTO "viajes" ("ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida", "estado")
SELECT 
  ruta_insertada.id,
  vehiculo.id,
  conductor.id,
  (NOW() + INTERVAL '1 day' + INTERVAL '7 hours')::TIMESTAMP,
  'programado'
FROM ruta_insertada, conductor, vehiculo
ON CONFLICT DO NOTHING
RETURNING id, "ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida";
