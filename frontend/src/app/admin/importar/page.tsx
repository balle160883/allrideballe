"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowRight,
  Map,
  Users,
  Car,
  AlertTriangle
} from "lucide-react";
import * as XLSX from 'xlsx';
import { getAuthHeader, API_URL } from "@/lib/api";

export default function ImportarPage() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        const isAdmin = 
          user.rol === 'admin' || 
          user.rol === 'admin_cliente' || 
          user.rol === 'admin_proveedor' ||
          user.rol === 'superadmin';
        if (!isAdmin) {
          router.push('/');
        }
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, []);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // Hoja de Rutas
    const rutasData = [
      {
        'nombre_ruta': 'Ruta Centro → Flex Norte',
        'origen': 'Centro Histórico, Guadalajara',
        'destino': 'Flex Norte, Tlaquepaque, Jalisco',
        'activa': 'si',
        'parada_1_nombre': 'Centro Histórico',
        'parada_1_latitud': 20.6736,
        'parada_1_longitud': -103.3496,
      }
    ];
    const wsRutas = XLSX.utils.json_to_sheet(rutasData);
    
    // Hoja de Empleados
    const empleadosData = [
      {
        'email': 'empleado1@empresa.com',
        'nombre_completo': 'Juan Pérez García',
        'identificador_tarjeta': 'EMP001',
      }
    ];
    const wsEmpleados = XLSX.utils.json_to_sheet(empleadosData);
    
    // Hoja de Viajes
    const viajesData = [
      {
        'nombre_ruta': 'Ruta Centro → Flex Norte',
        'matricula_vehiculo': 'AB-123-CD',
        'email_conductor': 'conductor1@allride.com',
        'fecha_hora_salida': '2026-05-22 07:00:00',
      }
    ];
    const wsViajes = XLSX.utils.json_to_sheet(viajesData);
    
    XLSX.utils.book_append_sheet(wb, wsRutas, '🛣️ Rutas');
    XLSX.utils.book_append_sheet(wb, wsEmpleados, '👥 Empleados');
    XLSX.utils.book_append_sheet(wb, wsViajes, '🚗 Viajes');
    
    XLSX.writeFile(wb, 'template-importacion-allride.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setStep(1);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const resultados: any = {
          rutas: [],
          empleados: [],
          viajes: [],
        };

        // Procesar Rutas
        if (workbook.Sheets['🛣️ Rutas'] || workbook.Sheets['Rutas']) {
          const wsRutas = workbook.Sheets['🛣️ Rutas'] || workbook.Sheets['Rutas'];
          const jsonRutas = XLSX.utils.sheet_to_json(wsRutas);
          resultados.rutas = jsonRutas;
        }

        // Procesar Empleados
        if (workbook.Sheets['👥 Empleados'] || workbook.Sheets['Empleados']) {
          const wsEmpleados = workbook.Sheets['👥 Empleados'] || workbook.Sheets['Empleados'];
          const jsonEmpleados = XLSX.utils.sheet_to_json(wsEmpleados);
          resultados.empleados = jsonEmpleados;
        }

        // Procesar Viajes
        if (workbook.Sheets['🚗 Viajes'] || workbook.Sheets['Viajes']) {
          const wsViajes = workbook.Sheets['🚗 Viajes'] || workbook.Sheets['Viajes'];
          const jsonViajes = XLSX.utils.sheet_to_json(wsViajes);
          resultados.viajes = jsonViajes;
        }

        setResults(resultados);
        setStep(2);
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setLoading(false);
      setError("Error al leer el archivo Excel.");
    }
  };

  const handleImportToSystem = async () => {
    if (!results) return;
    setLoading(true);
    setError("");
    setStep(3);

    try {
      const res = await fetch(`${API_URL}/transporte/importar-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(results),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al importar los datos.');
      }
      
      const finalResult = await res.json();
      setResults(finalResult);
      setStep(4);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Error al importar los datos al sistema.");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" size={36} />
          Importación Masiva de Datos
        </h1>
        <p className="text-slate-500 font-medium text-sm lg:text-base">
          Importa rutas, empleados y viajes desde un archivo Excel.
        </p>
      </div>

      {/* Paso 1: Descargar Template y Subir Archivo */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Download size={24} className="text-blue-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">1. Descarga el Template</h3>
                <p className="text-sm text-slate-500">
                  Usa nuestro Excel predefinido para llenar tus datos.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all"
            >
              <Download size={18} /> Descargar Template
            </button>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Upload size={24} className="text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">2. Sube tu Archivo</h3>
                <p className="text-sm text-slate-500">
                  Carga el archivo Excel con tus datos.
                </p>
              </div>
            </div>

            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              {!file ? (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload size={40} className="mb-2 text-slate-400" />
                  <p className="mb-1 text-sm font-bold text-slate-600">
                    <span className="font-extrabold text-blue-600">Haz clic para seleccionar</span> o arrastra tu Excel
                  </p>
                  <p className="text-xs text-slate-500">.xlsx o .xls</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet size={32} className="text-blue-600" />
                  <p className="text-sm font-bold text-slate-700">{file.name}</p>
                </div>
              )}
            </label>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-bold">
                {error}
              </div>
            )}

            {file && (
              <button
                onClick={handleProcessFile}
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                {loading ? "Procesando..." : "Analizar Archivo"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Paso 2: Vista Previa */}
      {step === 2 && results && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle size={32} className="text-emerald-600" />
            <div>
              <h3 className="text-xl font-bold text-slate-800">Archivo Analizado Correctamente</h3>
              <p className="text-sm text-slate-500">
                Revisa los datos antes de importarlos al sistema.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <Map size={28} className="text-blue-700" />
              <div>
                <p className="text-sm font-bold text-blue-800">{results.rutas?.length || 0}</p>
                <p className="text-xs text-blue-700 font-medium">Rutas</p>
              </div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
              <Users size={28} className="text-purple-700" />
              <div>
                <p className="text-sm font-bold text-purple-800">{results.empleados?.length || 0}</p>
                <p className="text-xs text-purple-700 font-medium">Empleados</p>
              </div>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
              <Car size={28} className="text-orange-700" />
              <div>
                <p className="text-sm font-bold text-orange-800">{results.viajes?.length || 0}</p>
                <p className="text-xs text-orange-700 font-medium">Viajes</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-bold">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 bg-slate-100 text-slate-700 font-bold p-3 rounded-xl hover:bg-slate-200 transition-all"
            >
              Volver
            </button>
            <button
              onClick={handleImportToSystem}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
              {loading ? "Importando..." : "Importar al Sistema"}
            </button>
          </div>
        </div>
      )}

      {/* Paso 4: Resultado Final */}
      {step === 4 && results && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle size={32} className="text-emerald-600" />
            <div>
              <h3 className="text-xl font-bold text-slate-800">¡Importación Completada!</h3>
              <p className="text-sm text-slate-500">
                Todos los datos se han importado correctamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle size={28} className="text-emerald-700" />
              <div>
                <p className="text-sm font-bold text-emerald-800">{results.rutas_creadas || 0}</p>
                <p className="text-xs text-emerald-700 font-medium">Rutas Creadas</p>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle size={28} className="text-emerald-700" />
              <div>
                <p className="text-sm font-bold text-emerald-800">{results.empleados_creados || 0}</p>
                <p className="text-xs text-emerald-700 font-medium">Empleados Creados</p>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle size={28} className="text-emerald-700" />
              <div>
                <p className="text-sm font-bold text-emerald-800">{results.viajes_creados || 0}</p>
                <p className="text-xs text-emerald-700 font-medium">Viajes Creados</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setStep(0);
              setResults(null);
              setFile(null);
            }}
            className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all"
          >
            <Upload size={20} /> Importar Otro Archivo
          </button>
        </div>
      )}

      {error && step !== 0 && step !== 2 && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle size={24} />
          <span className="font-bold">{error}</span>
        </div>
      )}
    </div>
  );
}
