// context/AppContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { DEFAULT_CONFIG, FAKE_TIME, THEMES, USE_MOCK_DATA } from '../constants/appConstants';
import { getActividades, getAlertas, getAusencias, getGaleria, getGuardias } from '../services/dataService';
import { formatToDDMMYYYY, normalizeDayName } from '../utils/dateUtils';
import { MOCK_ACTIVIDADES, MOCK_ALERTAS, MOCK_AUSENCIAS, MOCK_GUARDIAS } from '../utils/mockData';
export { DEFAULT_CONFIG };

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // ✅ Usar la constante DEFAULT_CONFIG
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [datosGuardias, setDatosGuardias] = useState([]);
    const [datosAusencias, setDatosAusencias] = useState([]);
    const [datosActividades, setDatosActividades] = useState([]);
    const [datosAlertas, setDatosAlertas] = useState([]);
    const [datosGaleria, setDatosGaleria] = useState([]);
    const [alertIndex, setAlertIndex] = useState(0);
    const [activeAlert, setActiveAlert] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdateSuccess, setLastUpdateSuccess] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [guardiasPorTramo, setGuardiasPorTramo] = useState({});
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    const CONFIG_STORAGE_KEY = 'kiosco_config';
    const DATA_CACHE_KEY = 'kiosco_data_cache';

    // ✅ Cargar configuración y CACHÉ DE DATOS persistida al iniciar
    useEffect(() => {
        const initContext = async () => {
            try {
                // 1. Cargar Configuración
                const savedConfigJSON = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
                if (savedConfigJSON) {
                    const savedConfig = JSON.parse(savedConfigJSON);
                    const merged = { ...DEFAULT_CONFIG };
                    Object.keys(savedConfig).forEach(key => {
                        const val = savedConfig[key];
                        if (val !== undefined && val !== null && val !== '') {
                            merged[key] = val;
                        } else if (typeof DEFAULT_CONFIG[key] === 'boolean' && typeof val === 'boolean') {
                            merged[key] = val;
                        }
                    });
                    setConfig(merged);
                }

                // 2. Cargar Datos en Caché (Modo Offline)
                const savedDataJSON = await AsyncStorage.getItem(DATA_CACHE_KEY);
                if (savedDataJSON) {
                    const cache = JSON.parse(savedDataJSON);
                    console.log('📦 Restaurando datos desde caché local (Modo Offline)...');
                    if (cache.guardias) setDatosGuardias(cache.guardias);
                    if (cache.ausencias) setDatosAusencias(cache.ausencias);
                    if (cache.actividades) setDatosActividades(cache.actividades);
                    if (cache.alertas) setDatosAlertas(cache.alertas);
                    if (cache.galeria) setDatosGaleria(cache.galeria);
                    if (cache.lastUpdate) setLastUpdateSuccess(new Date(cache.lastUpdate));
                }

                setIsConfigLoaded(true);
            } catch (e) {
                console.error('Error al inicializar contexto:', e);
                setIsConfigLoaded(true);
            }
        };
        initContext();
    }, []);

    // ✅ NUEVO: Persistir configuración cuando cambie
    useEffect(() => {
        if (isConfigLoaded) {
            AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
                .catch(e => console.error('Error al guardar config:', e));
        }
    }, [config, isConfigLoaded]);

    const cargarTodosLosDatos = useCallback(async (currentConfig) => {
        setIsLoading(true);
        console.log('Iniciando carga de datos desde las URLs...');

        const { urlGuardias, urlAusencias, urlAlertas, urlActividades, urlGaleria } = currentConfig;

        // ✅ LOG: Verificar si las URLs están llegando correctamente
        console.log('🌍 Cargando datos desde URLs:', { urlAlertas, urlGuardias });

        if (USE_MOCK_DATA) {
            console.log('🧪 Usando datos FICTICIOS (Modo Debug)');
            setDatosGuardias(MOCK_GUARDIAS);
            setDatosAusencias(MOCK_AUSENCIAS);
            setDatosAlertas(MOCK_ALERTAS);
            setDatosActividades(MOCK_ACTIVIDADES);
            setLastUpdateSuccess(new Date());
            setIsLoading(false);
            return;
        }

        try {
            const results = await Promise.allSettled([
                urlGuardias ? getGuardias(urlGuardias) : Promise.resolve(null),
                urlAusencias ? getAusencias(urlAusencias) : Promise.resolve(null),
                urlAlertas ? getAlertas(urlAlertas) : Promise.resolve(null),
                urlActividades ? getActividades(urlActividades) : Promise.resolve(null),
                urlGaleria ? getGaleria(urlGaleria) : Promise.resolve(null),
            ]);

            const [guardiasResult, ausenciasResult, alertasResult, actividadesResult, galeriaResult] = results;

            if (guardiasResult.status === 'fulfilled' && guardiasResult.value) {
                console.log(`📥 Guardias descargadas: ${guardiasResult.value.length} registros`);
                setDatosGuardias(guardiasResult.value);
            }
            if (ausenciasResult.status === 'fulfilled' && ausenciasResult.value) {
                console.log(`📥 Ausencias descargadas: ${ausenciasResult.value.length} registros`);
                setDatosAusencias(ausenciasResult.value);
            }
            if (alertasResult.status === 'fulfilled' && alertasResult.value) {
                setDatosAlertas(alertasResult.value);
            }
            if (actividadesResult.status === 'fulfilled' && actividadesResult.value) {
                console.log(`📥 Actividades descargadas: ${actividadesResult.value.length} registros`);
                setDatosActividades(actividadesResult.value);
            }
            if (galeriaResult?.status === 'fulfilled' && galeriaResult.value) {
                console.log(`📥 Galería descargada: ${galeriaResult.value.length} imágenes`);
                setDatosGaleria(galeriaResult.value);
            }

            setLastUpdateSuccess(new Date());
            console.log('Carga de datos completada.');

            // ✅ PERSISTENCIA: Guardar en caché local para modo offline
            const dataToCache = {
                guardias: guardiasResult.status === 'fulfilled' ? guardiasResult.value : datosGuardias,
                ausencias: ausenciasResult.status === 'fulfilled' ? ausenciasResult.value : datosAusencias,
                alertas: alertasResult.status === 'fulfilled' ? alertasResult.value : datosAlertas,
                actividades: actividadesResult.status === 'fulfilled' ? actividadesResult.value : datosActividades,
                galeria: galeriaResult?.status === 'fulfilled' ? galeriaResult.value : datosGaleria,
                lastUpdate: new Date().toISOString()
            };
            AsyncStorage.setItem(DATA_CACHE_KEY, JSON.stringify(dataToCache))
                .catch(e => console.error('Error al cachear datos:', e));

            // Opcional: Mostrar errores si alguna fuente falló
            results.forEach(result => {
                if (result.status === 'rejected') {
                    console.error('Error al cargar una fuente de datos:', result.reason);
                }
            });

        } catch (error) {
            Alert.alert('Error General', 'Ocurrió un error al cargar los datos.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Efecto para la carga inicial de datos (solo cuando la fecha/config están listas)
    useEffect(() => {
        if (isConfigLoaded) {
            cargarTodosLosDatos(config);
        }
    }, [isConfigLoaded]);

    // Efecto para la actualización automática de datos
    useEffect(() => {
        // No hacer nada si el intervalo es 0 o si no hay URLs configuradas
        if (!config.actualizacionDatos || config.actualizacionDatos <= 0 || !config.urlGuardias) {
            return;
        }

        console.log(`🔄 Configurando actualización automática cada ${config.actualizacionDatos / 1000} segundos.`);

        const intervalId = setInterval(() => {
            console.log('⏰ Disparando actualización automática de datos...');
            cargarTodosLosDatos(config);
        }, config.actualizacionDatos);

        // Función de limpieza: se ejecuta cuando el componente se desmonta o la config cambia
        return () => {
            console.log('🧹 Limpiando intervalo de actualización automática.');
            clearInterval(intervalId);
        };
    }, [config, cargarTodosLosDatos]); // Se vuelve a ejecutar si la config o la función de carga cambian

    // ✅ HELPER: Obtener valores de objetos ignorando mayúsculas, acentos, espacios y guiones bajos
    const getValor = useCallback((obj, posiblesNombres) => {
        if (!obj) return undefined;
        const keys = Object.keys(obj);
        // ✅ MEJORA: Normalización agresiva (elimina BOM, espacios raros y símbolos) para asegurar coincidencias
        const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

        // 1. Búsqueda EXACTA con valor NO VACÍO
        for (const nombre of posiblesNombres) {
            if (keys.includes(nombre)) {
                const val = obj[nombre];
                if (val !== undefined && val !== null && String(val).trim() !== '') return val;
            }
        }

        // 2. Búsqueda NORMALIZADA con valor NO VACÍO
        for (const nombre of posiblesNombres) {
            const nombreNorm = normalize(nombre);
            // Buscamos claves que coincidan exactamente o sean duplicados (ej: fecha1, fecha2)
            const candidates = keys.filter(k => {
                const kNorm = normalize(k);
                if (kNorm === nombreNorm) return true;
                // Permitir sufijos numéricos (ej: fecha1, fecha2) si el parser renombró columnas duplicadas
                if (kNorm.startsWith(nombreNorm)) {
                    return /^\d+$/.test(kNorm.slice(nombreNorm.length));
                }
                return false;
            });
            for (const key of candidates) {
                const val = obj[key];
                if (val !== undefined && val !== null && String(val).trim() !== '') return val;
            }
        }

        // 3. Fallback: Si todo está vacío, devolvemos el primer match encontrado (aunque sea vacío)
        for (const nombre of posiblesNombres) {
            if (keys.includes(nombre)) return obj[nombre];
        }
        for (const nombre of posiblesNombres) {
            const keyFound = keys.find(k => normalize(k) === normalize(nombre));
            if (keyFound) return obj[keyFound];
        }

        return undefined;
    }, []);

    // ✅ LÓGICA DE ALERTAS OPTIMIZADA
    // 1. Filtrar alertas válidas (Memoized para eficiencia y estabilidad)
    const alertasActivasHoy = React.useMemo(() => {
        if (!datosAlertas || datosAlertas.length === 0) {
            console.log('⚠️ No hay datos de alertas para procesar.');
            return [];
        }

        const parsearFechaSimple = (fechaStr) => {
            if (!fechaStr) return null;
            const formatted = formatToDDMMYYYY(fechaStr);
            if (!formatted) return null;

            const [dia, mes, anio] = formatted.split('/').map(Number);
            return new Date(anio, mes - 1, dia);
        };

        const parsearHoraAMinutos = (horaStr) => {
            if (!horaStr) return null;
            const partes = horaStr.split(':');
            if (partes.length < 2) return null; // ✅ FIX: Permitir HH:MM y HH:MM:SS
            const horas = parseInt(partes[0], 10);
            const minutos = parseInt(partes[1], 10);
            return (isNaN(horas) || isNaN(minutos)) ? null : horas * 60 + minutos;
        };

        const hoy = new Date(currentDate);
        hoy.setHours(0, 0, 0, 0);
        const minutosAhora = currentDate.getHours() * 60 + currentDate.getMinutes();

        // ✅ DEBUG: Ver qué claves llegan realmente para detectar errores de nombres
        console.log(`🔍 Procesando ${datosAlertas.length} alertas...`);

        const alertasFiltradas = datosAlertas.filter((alerta, index) => {
            // ✅ FIX: Normalizar para aceptar "Sí", "Si", "SI", "TRUE", "VERDADERO"
            const rawActivo = getValor(alerta, ['activo', 'ACTIVO']);
            const activo = rawActivo ? String(rawActivo).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : 'NO';

            const esActivo = ['SI', 'SÍ', 'TRUE', 'YES', '1', 'VERDADERO'].includes(activo);
            if (!esActivo) return false;

            // ✅ PRIORIDAD: Buscamos primero 'FECHA' para evitar que columnas antiguas vacías oculten el dato
            let rawFechaInicio = getValor(alerta, ['FECHA', 'Fecha', 'fechaInicio', 'FECHA_INICIO', 'Fecha Inicio', 'Inicio']);

            // ✅ FALLBACK INTELIGENTE: Si no se encuentra la fecha (o está vacía), probamos la PRIMERA COLUMNA del CSV.
            // Esto soluciona problemas con headers corruptos (BOM) o nombres inesperados.
            if (!rawFechaInicio || String(rawFechaInicio).trim() === '') {
                const keys = Object.keys(alerta);
                if (keys.length > 0) {
                    const primeraColumna = keys[0];
                    const valorPrimeraColumna = alerta[primeraColumna];

                    // Verificamos si el valor parece una fecha (tiene '/' o es un número serial de Excel > 30000)
                    if (valorPrimeraColumna && (String(valorPrimeraColumna).includes('/') || (!isNaN(valorPrimeraColumna) && Number(valorPrimeraColumna) > 30000))) {
                        if (index < 5) console.log(`[Alerta #${index}] ⚠️ Header 'FECHA' no detectado. Usando primera columna '${primeraColumna}' con valor: "${valorPrimeraColumna}"`);
                        rawFechaInicio = valorPrimeraColumna;
                    }
                }
            }

            const fechaInicio = parsearFechaSimple(rawFechaInicio);
            if (!fechaInicio) return false;

            const horaInicioMin = parsearHoraAMinutos(getValor(alerta, ['HORA_INICIO', 'Hora Inicio', 'horaInicio']));
            const horaFinMin = parsearHoraAMinutos(getValor(alerta, ['HORA_FIN', 'Hora Fin', 'horaFin']));

            // ✅ FIX: Clonar fechaInicio si no hay fechaFin para evitar modificar la referencia original
            const rawFechaFin = getValor(alerta, ['fechaFin', 'FECHA_FIN', 'Fecha Fin', 'Fin']);
            let fechaFin = parsearFechaSimple(rawFechaFin);

            // Si no hay fecha fin explícita, asumimos la misma fecha de inicio
            if (!fechaFin) {
                fechaFin = new Date(fechaInicio);
                // ✅ NUEVO: Si la hora de fin es menor que la de inicio (ej: 20:00 a 01:00), asumimos que termina al día siguiente (madrugada)
                if (horaInicioMin !== null && horaFinMin !== null && horaFinMin < horaInicioMin) {
                    fechaFin.setDate(fechaFin.getDate() + 1);
                }
            }

            fechaInicio.setHours(0, 0, 0, 0);
            fechaFin.setHours(23, 59, 59, 999);

            if (hoy < fechaInicio || hoy > fechaFin) return false;

            // Comprobación de horas dependiendo de si estamos en el día de inicio, fin o en medio
            const esDiaInicio = hoy.getTime() === fechaInicio.getTime();
            const esDiaFin = hoy.getTime() === fechaFin.getTime();

            if (esDiaInicio && horaInicioMin !== null && minutosAhora < horaInicioMin) return false;
            if (esDiaFin && horaFinMin !== null && minutosAhora >= horaFinMin) return false;

            return true;
        }).map(alerta => ({
            ...alerta,
            // Mapear 'MENSAJE' a 'mensaje' para que AppNavigator lo encuentre
            mensaje: getValor(alerta, ['MENSAJE', 'mensaje', 'descripcion', 'alerta']),
            // ✅ NUEVO: Mapear 'TIPO' a 'tipo' para controlar el color
            tipo: getValor(alerta, ['TIPO ALERTA', 'Tipo Alerta', 'tipo', 'TIPO', 'type', 'categoria'])
        }));

        console.log(`🔔 Alertas activas tras filtrado: ${alertasFiltradas.length}`);
        return alertasFiltradas;
    }, [datosAlertas, currentDate, getValor]);

    // 2. Actualizar la alerta visible (Se ejecuta inmediatamente al cambiar índice o lista)
    useEffect(() => {
        if (alertasActivasHoy.length === 0) {
            setActiveAlert(null);
            return;
        }
        const index = alertIndex % alertasActivasHoy.length;
        setActiveAlert(alertasActivasHoy[index]);
    }, [alertIndex, alertasActivasHoy]);

    // 3. Temporizador de rotación (Independiente del renderizado de la alerta)
    useEffect(() => {
        if (alertasActivasHoy.length <= 1) return;

        const interval = setInterval(() => {
            setAlertIndex(prev => prev + 1);
        }, 5000);

        return () => clearInterval(interval);
    }, [alertasActivasHoy.length]); // Solo se reinicia si cambia la cantidad de alertas

    // Efecto para actualizar la fecha y hora actual cada segundo
    useEffect(() => {
        const timerId = setInterval(() => {
            const now = new Date();
            if (FAKE_TIME) {
                const [h, m] = FAKE_TIME.split(':').map(Number);
                now.setHours(h, m, 0, 0);
            }
            setCurrentDate(now);
        }, 1000); // Se actualiza cada segundo

        // Limpieza: detener el intervalo cuando el componente se desmonte
        return () => {
            clearInterval(timerId);
        };
    }, []); // El array vacío asegura que el efecto se ejecute solo una vez

    // Efecto para procesar y agrupar las guardias por tramo horario
    useEffect(() => {
        if (!datosGuardias || datosGuardias.length === 0) {
            console.log('⚠️ No hay datos de guardias para agrupar.');
            setGuardiasPorTramo({});
            return;
        }

        const guardiasAgrupadas = datosGuardias.reduce((acc, guardia) => {
            const diaRaw = getValor(guardia, ['dia', 'Dia', 'Día', 'Day']);
            const dia = normalizeDayName(diaRaw);
            const tramo = getValor(guardia, ['tramo', 'Tramo', 'Hour']);

            // Si el día no existe en el acumulador, se inicializa como un objeto vacío
            if (!dia || !tramo) return acc;

            // ✅ FIX: Normalizar el objeto guardia para que la pantalla encuentre 'profesores'
            const guardiaNormalizada = {
                ...guardia,
                profesores: getValor(guardia, ['profesores', 'Profesores', 'Profesor', 'Guardia', 'Docente']),
                zona: getValor(guardia, ['zona', 'Zona', 'Lugar', 'Aula'])
            };

            if (!acc[dia]) {
                acc[dia] = {};
            }
            // Si el tramo para ese día no existe, se inicializa como un array
            if (!acc[dia][tramo]) {
                acc[dia][tramo] = [];
            }
            // Se añade la guardia actual a la lista de ese día y tramo
            acc[dia][tramo].push(guardiaNormalizada);
            return acc;
        }, {});

        console.log('✅ Guardias agrupadas por día:', Object.keys(guardiasAgrupadas));
        setGuardiasPorTramo(guardiasAgrupadas);
    }, [datosGuardias, getValor]); // Se ejecuta cada vez que los datos de las guardias cambian

    const isDark = config.darkMode !== false; // Oscuro por defecto si no está definido
    const theme = isDark ? THEMES.dark : THEMES.light;

    const value = {
        config,
        setConfig,
        theme,
        isDark,
        datosGuardias,
        setDatosGuardias,
        datosAusencias,
        setDatosAusencias,
        datosActividades,
        setDatosActividades,
        datosAlertas,
        setDatosAlertas,
        datosGaleria,
        setDatosGaleria,
        isLoading,
        cargarTodosLosDatos,
        activeAlert,
        currentDate,
        guardiasPorTramo, // Exportamos los datos agrupados
        lastUpdateSuccess,
        isConfigLoaded, // Útil para saber si ya restauramos los datos del usuario
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook personalizado para usar el contexto fácilmente
export const useAppContext = () => useContext(AppContext);
