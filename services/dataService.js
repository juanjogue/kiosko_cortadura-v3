// services/dataService.js
import Papa from 'papaparse';
import { ORDEN_TRAMOS } from '../constants/appConstants';
import { formatToDDMMYYYY, normalizeDayName } from '../utils/dateUtils';

// La lógica de los proxies CORS sigue siendo relevante
const PROXY_URLS = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];

// Función para obtener y parsear un CSV
async function fetchAndParseCSV(sheetUrl) {
    // ✅ CORRECCIÓN AUTOMÁTICA: Eliminar 'h' extra si el usuario se equivoca al pegar
    if (sheetUrl && typeof sheetUrl === 'string' && sheetUrl.startsWith('hhttps')) {
        sheetUrl = sheetUrl.replace('hhttps', 'https');
    }

    let csvUrl;
    if (sheetUrl.includes('/pubhtml')) {
        // Maneja las URLs publicadas en la web
        csvUrl = sheetUrl.replace('/pubhtml', '/pub?output=csv');
    } else {
        // Maneja las URLs de edición estándar
        csvUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
    }
    let response;
    let text;

    try {
        if (sheetUrl.includes('drive.google.com/drive/folders')) {
            throw new Error('Estás usando un enlace a una CARPETA de Drive. Debes usar el enlace "Publicar en la web" -> "CSV" de tu Google Sheet.');
        }

        // Si es una imagen directa o un archivo de drive individual, no intentamos parsear CSV
        if (sheetUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) || (sheetUrl.includes('drive.google.com') && !sheetUrl.includes('spreadsheets'))) {
            return [{ url: sheetUrl, titulo: 'Imagen Directa' }];
        }

        // Intento directo primero
        response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Direct fetch failed');
        text = await response.text();
    } catch (error) {
        console.warn('Direct fetch failed, trying with CORS proxy...');
        // Fallback a los proxies
        for (const proxy of PROXY_URLS) {
            try {
                const proxyUrl = `${proxy}${encodeURIComponent(csvUrl)}`;
                response = await fetch(proxyUrl);
                if (response.ok) {
                    text = await response.text();
                    break;
                }
            } catch (proxyError) {
                console.warn(`Proxy failed: ${proxy}`);
            }
        }
    }

    if (!text) {
        throw new Error('Could not fetch data from any source.');
    }

    // Usar Papaparse para convertir el texto CSV a JSON
    return new Promise(resolve => {
        Papa.parse(text, {
            header: true, // Trata la primera fila como cabeceras
            skipEmptyLines: true,
            transformHeader: header => header.trim(), // Limpia los encabezados
            complete: (results) => {
                resolve(results.data);
            }
        });
    });
}

// Función auxiliar para encontrar el nombre de una columna de forma flexible
function findKey(obj, keywords) {
    const keys = Object.keys(obj);
    for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        const foundKey = keys.find(k => k.toLowerCase().includes(lowerKeyword));
        if (foundKey) return foundKey;
    }
    return null;
}

// Función para procesar y transformar las guardias
function procesarGuardias(datosEnBruto) {
    const guardiasProcesadas = [];

    datosEnBruto.forEach(fila => {
        // Búsqueda flexible de la columna del día
        const diaKey = findKey(fila, ['día', 'dia']);
        if (!diaKey) return;
        const dia = fila[diaKey]?.trim();
        if (!dia) return;

        const diaNormalizado = normalizeDayName(dia);

        ORDEN_TRAMOS.forEach(tramo => {
            const profesoresStr = fila[tramo];
            if (profesoresStr && profesoresStr.trim()) {
                const profesores = profesoresStr.split(';').map(p => p.trim()).filter(Boolean);
                if (profesores.length > 0) {
                    guardiasProcesadas.push({ dia: diaNormalizado, tramo, profesores });
                }
            }
        });
    });
    return guardiasProcesadas;
}

// Función para procesar y agrupar las ausencias
function procesarAusencias(datosEnBruto) {
    const ausenciasMap = new Map();

    datosEnBruto.forEach(fila => {
        // Búsqueda flexible de columnas
        const profesorKey = findKey(fila, ['profesor']);
        const fechaKey = findKey(fila, ['fecha']);
        const horaKey = findKey(fila, ['hora']);
        const grupoKey = findKey(fila, ['grupo']);
        const aulaKey = findKey(fila, ['aula']);
        const tareaKey = findKey(fila, ['tarea']);

        const profesor = profesorKey ? fila[profesorKey]?.trim() : null;
        let fecha = fechaKey ? formatToDDMMYYYY(fila[fechaKey]) : null;
        let hora = horaKey ? fila[horaKey]?.trim().toUpperCase() : null;
        const grupo = grupoKey ? fila[grupoKey]?.trim() : null;
        const aula = aulaKey ? fila[aulaKey]?.trim() : null;
        const tarea = tareaKey ? fila[tareaKey]?.trim() : null;

        if (!profesor || !fecha || !hora) {
            return; // Ignorar filas incompletas
        }

        if (hora !== 'RECREO') {
            const horaNum = parseInt(hora);
            if (isNaN(horaNum)) return; // Ignorar si la hora no es un número válido
            hora = String(horaNum);
        }

        const key = `${profesor}_${fecha}`;
        if (!ausenciasMap.has(key)) {
            ausenciasMap.set(key, { profesor, fecha, horas: {} });
        }

        const registro = ausenciasMap.get(key);

        if (hora === 'RECREO') {
            registro.horas['RECREO'] = { grupo: grupo || '', zona: aula || '', tarea: tarea || '' };
        } else {
            registro.horas[hora] = { grupo: grupo || '', aula: aula || '', tarea: tarea || '' };
        }
    });

    return Array.from(ausenciasMap.values());
}

// Función para procesar y agrupar las actividades
function procesarActividades(datosEnBruto) {
    return datosEnBruto.map(fila => {
        // Búsqueda flexible de columnas
        const actividadKey = findKey(fila, ['actividad']);
        const fechaKey = findKey(fila, ['fecha']);
        const deptoKey = findKey(fila, ['departamento']);
        const horaInicioKey = findKey(fila, ['hora comienzo', 'hora inicio']);
        const horaFinKey = findKey(fila, ['hora fin']);
        const alumnadoKey = findKey(fila, ['alumnado']);
        const lugarKey = findKey(fila, ['lugar']);
        const obsKey = findKey(fila, ['observaciones']);

        const actividad = actividadKey ? fila[actividadKey]?.trim() : null;
        let fecha = fechaKey ? formatToDDMMYYYY(fila[fechaKey]) : null;

        if (!actividad || !fecha) {
            return null; // Ignorar filas sin datos esenciales
        }

        // Agrupar profesores en un solo string
        // ✅ MEJORA: Adaptado a cabeceras PROFESOR1, PROFESOR2... (sin espacios) y variantes
        const profesores = [
            findKey(fila, ['profesor 1', 'profesor1', 'responsable']),
            findKey(fila, ['profesor 2', 'profesor2', 'acompañante']),
            findKey(fila, ['profesor 3', 'profesor3']),
            findKey(fila, ['profesor 4', 'profesor4'])
        ]
            .map(key => key ? fila[key] : null)
            .filter(p => p && p.trim())
            .map(p => p.trim())
            .join('; ');

        return {
            actividad,
            fecha,
            departamento: deptoKey ? fila[deptoKey]?.trim() : '',
            horaInicio: horaInicioKey ? fila[horaInicioKey]?.trim() : '',
            horaFin: horaFinKey ? fila[horaFinKey]?.trim() : '',
            profesores: profesores,
            alumnado: alumnadoKey ? fila[alumnadoKey]?.trim() : '',
            lugar: lugarKey ? fila[lugarKey]?.trim() : '',
            observaciones: obsKey ? fila[obsKey]?.trim() : ''
        };
    }).filter(Boolean); // Eliminar nulos si hubo filas inválidas
}

// Función para procesar las alertas
function procesarAlertas(datosEnBruto) {
    return datosEnBruto.map(fila => {
        // ✅ CORRECCIÓN: Búsqueda flexible de columnas con guiones bajos y variantes comunes
        const fechaInicioKey = findKey(fila, ['fecha', 'FECHA', 'fecha_inicio', 'fecha inicio', 'inicio']);
        const fechaFinKey = findKey(fila, ['fecha_fin', 'fecha fin', 'fin']);
        const horaInicioKey = findKey(fila, ['hora_inicio', 'hora inicio']);
        const horaFinKey = findKey(fila, ['hora_fin', 'hora fin']);
        const mensajeKey = findKey(fila, ['mensaje', 'MENSAJE', 'descripcion', 'alerta']);
        const tipoKey = findKey(fila, ['tipo', 'TIPO', 'tipo alerta', 'TIPO ALERTA']);
        const activoKey = findKey(fila, ['activo', 'ACTIVO']);

        let fechaInicio = fechaInicioKey ? fila[fechaInicioKey]?.trim() : '';
        let fechaFin = fechaFinKey ? fila[fechaFinKey]?.trim() : '';

        // ✅ CORRECCIÓN: Normalizar ambas fechas a DD/MM/YYYY
        [fechaInicio, fechaFin].forEach((fecha, index) => {
            if (fecha) {
                try {
                    const partes = fecha.split('/');
                    if (partes.length < 2) throw new Error("Formato de fecha incompleto");
                    const dia = partes[0].padStart(2, '0');
                    const mes = partes[1].padStart(2, '0');
                    const anio = partes[2] || new Date().getFullYear();
                    const fechaNormalizada = `${dia}/${mes}/${anio}`;
                    if (index === 0) fechaInicio = fechaNormalizada;
                    else fechaFin = fechaNormalizada;
                } catch (e) {
                    console.warn(`Fecha de alerta inválida: ${fecha}`);
                }
            }
        });

        return {
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            horaInicio: horaInicioKey ? fila[horaInicioKey]?.trim() : '',
            horaFin: horaFinKey ? fila[horaFinKey]?.trim() : '',
            mensaje: mensajeKey ? fila[mensajeKey]?.trim() : '',
            tipo: tipoKey ? fila[tipoKey]?.trim() : 'Info',
            activo: activoKey ? fila[activoKey]?.trim().toUpperCase() : ''
        };
    });
}

// Función para procesar la galería (Super robusta)
function procesarGaleria(datosEnBruto) {
    if (!datosEnBruto || (!Array.isArray(datosEnBruto)) || datosEnBruto.length === 0) return [];

    return datosEnBruto.map((fila, index) => {
        if (!fila) return null;

        const celdas = Object.values(fila);
        const llaves = Object.keys(fila);

        // 1. Buscamos cualquier celda que empiece por http (prioridad enlaces)
        let rawUrl = celdas.find(v => v && typeof v === 'string' && v.trim().toLowerCase().startsWith('http'));

        if (!rawUrl) return null;

        let url = String(rawUrl).trim();

        // 2. Buscamos el título (cualquier celda que NO sea la URL y no esté vacía)
        let titulo = '';
        const tituloKey = llaves.find(k => k.toLowerCase().includes('tit') || k.toLowerCase().includes('nom'));
        if (tituloKey && fila[tituloKey]) {
            titulo = String(fila[tituloKey]);
        } else {
            const potentialTitle = celdas.find(v => v && v !== rawUrl && String(v).trim().length > 2);
            titulo = potentialTitle ? String(potentialTitle) : '';
        }

        // ✅ CONVERSOR DRIVE DEFINITIVO (Máxima compatibilidad)
        if (url.includes('drive.google.com')) {
            let fileId = '';
            const matches = [
                url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/),
                url.match(/[?&]id=([a-zA-Z0-9_-]+)/),
                url.match(/\/uc\?id=([a-zA-Z0-9_-]+)/),
                url.match(/\/open\?id=([a-zA-Z0-9_-]+)/)
            ];

            for (const m of matches) {
                if (m && m[1]) { fileId = m[1]; break; }
            }

            if (fileId) {
                // ✅ SOLUCIÓN MAESTRA: Usamos images.weserv.nl como puente.
                // Esto soluciona los problemas de CORS y bloqueos de Drive en navegadores y Smart TV.
                const driveDirectLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
                url = `https://images.weserv.nl/?url=${encodeURIComponent(driveDirectLink)}&w=1920&q=80`;
            }
        }

        return { url, titulo: titulo.trim() };
    }).filter(Boolean);
}

export const getGaleria = async (url) => {
    try {
        // 1. Si es un enlace directo a Drive o imagen, lo devolvemos como array de 1 item
        if (url.includes('drive.google.com/file') || url.includes('drive.google.com/open') || url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
            console.log("📸 Galería - Detectado enlace directo, saltando CSV.");
            return procesarGaleria([{ url }]);
        }

        // 2. Si no, intentamos cargar como CSV (Excel)
        const datosEnBruto = await fetchAndParseCSV(url);
        const datosProcesados = procesarGaleria(datosEnBruto);
        return datosProcesados;
    } catch (error) {
        console.error("❌ Error cargando galería:", error.message);
        throw error;
    }
};

export const getAusencias = async (url) => {
    const datosEnBruto = await fetchAndParseCSV(url);
    const datosProcesados = procesarAusencias(datosEnBruto);
    return datosProcesados;
};

export const getGuardias = async (url) => {
    const datosEnBruto = await fetchAndParseCSV(url);
    const datosProcesados = procesarGuardias(datosEnBruto);
    return datosProcesados;
};

export const getActividades = async (url) => {
    const datosEnBruto = await fetchAndParseCSV(url);
    const datosProcesados = procesarActividades(datosEnBruto);
    return datosProcesados;
};

export const getAlertas = async (url) => {
    const datosEnBruto = await fetchAndParseCSV(url);
    const datosProcesados = procesarAlertas(datosEnBruto);
    console.log(`📥 Alertas: ${datosProcesados.length} activas hoy`);
    return datosProcesados;
};
