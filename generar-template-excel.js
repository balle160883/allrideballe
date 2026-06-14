const XLSX = require('xlsx');
const path = require('path');

function generateTemplate() {
  console.log('📊 Generando template de Excel...\n');

  // 1. Hoja de Instrucciones
  const instruccionesData = [
    ['📋 Instrucciones para llenar el Excel', '', ''],
    ['', '', ''],
    ['', '🛣️ Hoja "Rutas":', ''],
    ['1', 'Llene los datos de la ruta (nombre, origen, destino)', ''],
    ['2', 'Marque "si" o "no" en la columna "activa"', ''],
    ['3', 'Agregue las paradas (máximo 20 paradas)', ''],
    ['4', 'Las coordenadas son opcionales pero recomendadas', ''],
    ['', '', ''],
    ['', '👥 Hoja "Empleados":', ''],
    ['1', 'Llene el email del empleado (único)', ''],
    ['2', 'Escriba el nombre completo', ''],
    ['3', 'Identificador de tarjeta (opcional)', ''],
    ['', '', ''],
    ['', '🚗 Hoja "Viajes":', ''],
    ['1', 'Escriba el nombre de la ruta (debe existir)', ''],
    ['2', 'Matrícula del vehículo (debe existir)', ''],
    ['3', 'Email del conductor (debe existir)', ''],
    ['4', 'Fecha y hora de salida (formato: YYYY-MM-DD HH:MM:SS)', ''],
  ];

  // 2. Hoja de Rutas (ejemplo)
  const rutasData = [
    {
      nombre_ruta: 'Ruta Centro → Flex Norte',
      origen: 'Centro Histórico, Guadalajara',
      destino: 'Flex Norte, Tlaquepaque, Jalisco',
      activa: 'si',
      parada_1_nombre: 'Centro Histórico',
      parada_1_latitud: 20.6736,
      parada_1_longitud: -103.3496,
      parada_2_nombre: 'Av. Vallarta',
      parada_2_latitud: 20.6745,
      parada_2_longitud: -103.3701,
      parada_3_nombre: 'Plaza del Sol',
      parada_3_latitud: 20.6789,
      parada_3_longitud: -103.3850,
    }
  ];

  // 3. Hoja de Empleados (ejemplo)
  const empleadosData = [
    {
      email: 'empleado1@empresa.com',
      nombre_completo: 'Juan Pérez García',
      identificador_tarjeta: 'EMP001',
    },
    {
      email: 'empleado2@empresa.com',
      nombre_completo: 'María López Hernández',
      identificador_tarjeta: 'EMP002',
    },
  ];

  // 4. Hoja de Viajes (ejemplo)
  const viajesData = [
    {
      nombre_ruta: 'Ruta Centro → Flex Norte',
      matricula_vehiculo: 'AB-123-CD',
      email_conductor: 'conductor1@allride.com',
      fecha_hora_salida: '2026-05-22 07:00:00',
    }
  ];

  // Crear las hojas
  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instruccionesData);
  const wsRutas = XLSX.utils.json_to_sheet(rutasData);
  const wsEmpleados = XLSX.utils.json_to_sheet(empleadosData);
  const wsViajes = XLSX.utils.json_to_sheet(viajesData);

  // Crear el libro
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, '📋 Instrucciones');
  XLSX.utils.book_append_sheet(wb, wsRutas, '🛣️ Rutas');
  XLSX.utils.book_append_sheet(wb, wsEmpleados, '👥 Empleados');
  XLSX.utils.book_append_sheet(wb, wsViajes, '🚗 Viajes');

  // Ajustar ancho de columnas para que se vea bien
  const wscols = [
    { wch: 10 },
    { wch: 45 },
    { wch: 20 },
  ];
  
  Object.keys(wb.Sheets).forEach(sheetName => {
    wb.Sheets[sheetName]['!cols'] = wscols;
  });

  // Guardar el archivo en la carpeta raíz
  const outputPath = path.join(__dirname, 'template-importacion-allride.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log('✅ Template generado exitosamente!');
  console.log('📁 Ruta:', outputPath);
  console.log();
  console.log('📋 El template contiene 4 hojas:');
  console.log('   1. 📋 Instrucciones');
  console.log('   2. 🛣️ Rutas');
  console.log('   3. 👥 Empleados');
  console.log('   4. 🚗 Viajes');
}

generateTemplate();
