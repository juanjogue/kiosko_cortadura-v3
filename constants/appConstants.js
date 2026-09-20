/**
 * Global application constants
 */

export const USE_MOCK_DATA = false; // Set to true to use fake data for testing
export const FAKE_TIME = null; // Set to null for real time, or "HH:MM" to simulate a specific time

export const ORDEN_TRAMOS = ['1', '2', '3', 'RECREO', '4', '5', '6'];

export const DIAS_SEMANA = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
];

export const THEMES = {
    dark: {
        background: '#0f172a',
        card: '#1e293b',
        text: '#ffffff',
        textSecondary: '#94a3b8',
        border: '#334155',
        glassIntensity: 30,
    },
    light: {
        background: '#f8fafc',
        card: '#ffffff',
        text: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        glassIntensity: 80,
    }
};

export const COLORS = {
    primary: '#0f172a',    // Slate 900
    secondary: '#1e293b',  // Slate 800
    accent: '#3b82f6',     // Blue 500
    success: '#10b981',    // Emerald 500
    warning: '#f59e0b',    // Amber 500
    danger: '#ef4444',     // Red 500
    info: '#06b6d4',       // Cyan 500
    text: {
        primary: '#ffffff',
        secondary: '#94a3b8', // Slate 400
        muted: '#64748b',     // Slate 500
    },
    background: '#0f172a',
};

export const DEFAULT_CONFIG = {
    rotacionIntervalo: 20000,
    actualizacionDatos: 60000,
    mostrarGuardias: true,
    mostrarAusencias: true,
    mostrarResumen: true,
    mostrarActividades: true,
    darkMode: true,
    // Galería / Cartelería
    mostrarGaleria: false,
    urlGaleria: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTfog7Cm412oghVvVasz_XUTy2lgR7x_kb_cxvVWYAsdGBIa6FocVqd4syiBKcCDiz1jKtV0Qtfso0D/pub?output=csv',
    galeriaIntervalo: 7000, // 7 segundos por imagen interna
    // Pantalla RSS
    rssEnabled: false,
    urlRss: 'https://e00-elmundo.uecdn.es/elmundo/rss/andalucia.xml',
    tituloRss: 'Noticias El Mundo Andalucía',
    // Pantalla Tiempo
    weatherEnabled: false,
    weatherLat: '36.52',
    weatherLon: '-6.28',
    weatherCity: 'Cádiz',
    // URLs por defecto de Google Sheets
    urlGuardias: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTys484unlw9HouZLvfaT1HeV9zdn24jGzcT-F7__EMQG-0tuu1ylXHg6MpklCkwQDojfed4B8aKDot/pub?output=csv',
    urlAusencias: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShyK5np1YxNiTfE36yvmR05zFO4ji0-_YW-6UMmKJ3AopDDsZW5Hz1lmzcNfyadtt51-gs5aNx4XER/pub?gid=2111711524&single=true&output=csv',
    urlAlertas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTv9D9yD--6U2rS7LcPy8lwc9O0THHUU96UPju2y4US4bW5OXAe-70sPcV95gW0XfdEE72D3WnExMVr/pub?output=csv',
    urlActividades: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRU6-MIrAOXPRcRArrkMECyDdtxBFmezookCWJtjBJ9_eQOpZ_An7H3ZiJqr1_-k0L-Tp3cHvyve5lk/pub?output=csv',
    horarios: [
        { tramo: '1', inicio: '08:15', fin: '09:15' },
        { tramo: '2', inicio: '09:15', fin: '10:15' },
        { tramo: '3', inicio: '10:15', fin: '11:15' },
        { tramo: 'RECREO', inicio: '11:15', fin: '11:45' },
        { tramo: '4', inicio: '11:45', fin: '12:45' },
        { tramo: '5', inicio: '12:45', fin: '13:45' },
        { tramo: 6, inicio: '13:45', fin: '14:45' }
    ],
    // Bloqueo de pantalla al cambio de tramo
    guardiaOverrideEnabled: true,
    guardiaOverrideDuration: 200,
    guardiaOverrideSoundEnabled: true,
    guardiaOverrideSoundLoop: false,
    customSoundUri: null,
    // Configuración para WebViews
    urlWeb1: '',
    tituloWeb1: 'Página Web 1',
    web1Enabled: false,
    urlWeb2: '',
    tituloWeb2: 'Página Web 2',
    web2Enabled: false,
    adminPin: '1234',
};

export const AUTO_SCROLL_SETTINGS = {
    DEFAULT_SPEED: 0.2,
    RSS_SPEED: 0.2, // Slower for news reading
    ACTIVITIES_SPEED: 0.4, // Slower than the previous 1.0
    WAIT_DURATION_MS: 3000,
};
