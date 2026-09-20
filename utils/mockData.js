/**
 * Mock data for testing purposes
 */
import { formatToDDMMYYYY, normalizeDayName } from './dateUtils';

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

const todayStr = formatToDDMMYYYY(today);
const tomorrowStr = formatToDDMMYYYY(tomorrow);

const diaActual = today.toLocaleDateString('es-ES', { weekday: 'long' });
const diaSiguiente = tomorrow.toLocaleDateString('es-ES', { weekday: 'long' });

export const MOCK_AUSENCIAS = [
    {
        profesor: "García López, María",
        fecha: todayStr,
        horas: {
            "1": { grupo: "1º ESO A", aula: "AULA 101", tarea: "Realizar ejercicios página 45" },
            "2": { grupo: "2º ESO B", aula: "AULA 202", tarea: "Lectura comprensiva cap. 3" },
            "RECREO": { grupo: "Guardia Recreo", zona: "PATIO NORTE", tarea: "" }
        }
    },
    {
        profesor: "Rodríguez Sanz, Pedro",
        fecha: todayStr,
        horas: {
            "3": { grupo: "4º ESO C", aula: "LAB QUIMICA", tarea: "Práctica de enlaces" },
            "4": { grupo: "1º BACH A", aula: "AULA 301", tarea: "Comentario de texto" }
        }
    },
    {
        profesor: "Martínez Ruíz, Ana",
        fecha: todayStr,
        horas: {
            "5": { grupo: "2º BACH B", aula: "AULA 402", tarea: "Repaso para examen" },
            "6": { grupo: "3º ESO A", aula: "AULA 205", tarea: "Dibujo técnico" }
        }
    },
    {
        profesor: "Fernández Gómez, Javier",
        fecha: tomorrowStr,
        horas: {
            "1": { grupo: "1º ESO B", aula: "AULA 102", tarea: "Matemáticas básicas" }
        }
    }
];

export const MOCK_GUARDIAS = [
    { dia: normalizeDayName(diaActual), tramo: "1", profesores: ["Juan Pérez", "Marta Sánchez", "Luis Cano"] },
    { dia: normalizeDayName(diaActual), tramo: "2", profesores: ["Elena Pozo", "Marcos Rius"] },
    { dia: normalizeDayName(diaActual), tramo: "3", profesores: ["Sonia Gil", "Roberto Jara"] },
    { dia: normalizeDayName(diaActual), tramo: "RECREO", profesores: ["Toda la plantilla de guardia"] },
    { dia: normalizeDayName(diaActual), tramo: "4", profesores: ["Pedro Picazo", "Julia Domínguez"] },
    { dia: normalizeDayName(diaActual), tramo: "5", profesores: ["Carmen López", "Antonio Vico"] },
    { dia: normalizeDayName(diaActual), tramo: "6", profesores: ["Sara Bernal", "Hugo Silva"] },
    // Mañana
    { dia: normalizeDayName(diaSiguiente), tramo: "1", profesores: ["Profesor Mañana 1", "Profesor Mañana 2"] }
];

export const MOCK_ACTIVIDADES = [
    {
        actividad: "Visita al Museo de Arte Contemporáneo",
        fecha: todayStr,
        departamento: "Geografía e Historia",
        horaInicio: "09:15",
        horaFin: "14:45",
        profesores: "Elena Pozo; Marcos Rius",
        alumnado: "2º BACH A y B",
        lugar: "Málaga",
        observaciones: "Salida desde la puerta principal a las 09:00"
    },
    {
        actividad: "Charla Orientación Universitaria",
        fecha: todayStr,
        departamento: "Orientación",
        horaInicio: "11:45",
        horaFin: "12:45",
        profesores: "Ana Belén Jurado",
        alumnado: "4º ESO C",
        lugar: "Salón de Actos",
        observaciones: ""
    }
];

export const MOCK_ALERTAS = [
    {
        fechaInicio: todayStr,
        fechaFin: todayStr,
        horaInicio: "08:00",
        horaFin: "23:59",
        mensaje: "⚠️ Recordatorio: Reunión de departamento a las 15:00 en la biblioteca.",
        tipo: "Aviso",
        activo: "SI"
    },
    {
        fechaInicio: todayStr,
        fechaFin: tomorrowStr,
        horaInicio: "08:00",
        horaFin: "23:59",
        mensaje: "📢 Mañana se celebra el Día del Centro. Consultar cuadrante de actividades.",
        tipo: "Info",
        activo: "SI"
    }
];
