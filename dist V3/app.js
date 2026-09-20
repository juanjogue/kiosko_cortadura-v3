/* ============================================================
   Kiosco TV ligero - IES Fuerte de Cortadura
   Versión para navegador ligero en Smart TV con Linux (WebKit viejo)
   JS ES5: sin let/const/flechas/template literals/fetch/Promise.allSettled
   Fuentes: Google Sheets CSV, rss2json, Open-Meteo en
   ============================================================ */
(function () {
    'use strict';

    var DOC = document;
    var VPORT = DOC.getElementById('screenViewport');

    /* ==========================================================
       1. CONFIGURACIÓN (mismas claves que la app pesada)
       ========================================================== */
    var DEFAULT_CONFIG = {
        rotacionIntervalo: 20000,
        actualizacionDatos: 60000,
        mostrarGuardias: true,
        mostrarAusencias: true,
        mostrarResumen: true,
        darkMode: true,
        mostrarGaleria: false,
        urlGaleria: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTfog7Cm412oghVvVasz_XUTy2lgR7x_kb_cxvVWYAsdGBIa6FocVqd4syiBKcCDiz1jKtV0Qtfso0D/pub?output=csv',
        galeriaIntervalo: 7000,
        rssEnabled: false,
        urlRss: 'https://e00-elmundo.uecdn.es/elmundo/rss/andalucia.xml',
        tituloRss: 'Noticias El Mundo Andalucía',
        weatherEnabled: false,
        weatherLat: '36.52',
        weatherLon: '-6.28',
        weatherCity: 'Cádiz',
        urlGuardias: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTys484unlw9HouZLvfaT1HeV9zdn24jGzcT-F7__EMQG-0tuu1ylXHg6MpklCkwQDojfed4B8aKDot/pub?output=csv',
        urlAusencias: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShyK5np1YxNiTfE36yvmR05zFO4ji0-_YW-6UMmKJ3AopDDsZW5Hz1lmzcNfyadtt51-gs5aNx4XER/pub?gid=2111711524&single=true&output=csv',
        urlAlertas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTv9D9yD--6U2rS7LcPy8lwc9O0THHUU96UPju2y4US4bW5OXAe-70sPcV95gW0XfdEE72D3WnExMVr/pub?output=csv',
        horarios: [
            { tramo: '1', inicio: '08:15', fin: '09:15' },
            { tramo: '2', inicio: '09:15', fin: '10:15' },
            { tramo: '3', inicio: '10:15', fin: '11:15' },
            { tramo: 'RECREO', inicio: '11:15', fin: '11:45' },
            { tramo: '4', inicio: '11:45', fin: '12:45' },
            { tramo: '5', inicio: '12:45', fin: '13:45' },
            { tramo: '6', inicio: '13:45', fin: '14:45' }
        ],
        guardiaOverrideEnabled: true,
        guardiaOverrideDuration: 200,
        adminPin: '1234'
    };

    var CONFIG_KEY = 'kiosco_config';
    var CACHE_KEY = 'kiosco_data_cache';
    var STATE = {};
    var cfg = loadConfig();

    function loadConfig() {
        var saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(CONFIG_KEY));
        } catch (e) { saved = null; }
        if (!saved) return cloneObj(DEFAULT_CONFIG);
        var merged = cloneObj(DEFAULT_CONFIG);
        for (var k in saved) {
            if (saved[k] !== undefined && saved[k] !== null && saved[k] !== '') {
                merged[k] = saved[k];
            }
        }
        return merged;
    }

    function saveConfig() {
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch (e) { /* sin espacio */ }
    }

    function cloneObj(o) {
        var out = {};
        for (var k in o) { if (o.hasOwnProperty(k)) out[k] = o[k]; }
        return out;
    }

    /* ==========================================================
       2. UTILIDADES
       ========================================================== */
    function trim(s) {
        return String(s === undefined || s === null ? '' : s).replace(/^\s+|\s+$/g, '');
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    var ORDEN_TRAMOS = ['1', '2', '3', 'RECREO', '4', '5', '6'];

    var DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    function normalizeDayName(diaStr) {
        if (!diaStr) return '';
        var norm = trim(diaStr).toLowerCase();
        norm = norm.replace(/[\u0300-\u036f]/g, '');
        return norm.charAt(0).toUpperCase() + norm.slice(1);
    }

    function formatToDDMMYYYY(dateValue) {
        if (!dateValue) return '';
        var str = trim(dateValue);
        if (!isNaN(str) && str.indexOf('/') === -1) {
            try {
                var fechaObj = new Date((Number(str) - 25569) * 86400000);
                return pad2(fechaObj.getDate()) + '/' + pad2(fechaObj.getMonth() + 1) + '/' + fechaObj.getFullYear();
            } catch (e) { return ''; }
        }
        if (str.indexOf('/') !== -1) {
            var parts = str.split('/');
            if (parts.length < 2) return '';
            var day = pad2(Number(parts[0]));
            var month = pad2(Number(parts[1]));
            var year = parts[2] || new Date().getFullYear();
            return day + '/' + month + '/' + year;
        }
        return '';
    }

    function todayStr() {
        var n = new Date();
        return pad2(n.getDate()) + '/' + pad2(n.getMonth() + 1) + '/' + n.getFullYear();
    }

    /* ==========================================================
       3. PARSER CSV + CARGA CON PROXY CORS
       ========================================================== */
    function parseCSVRows(text) {
        if (!text) return [];
        text = text.replace(/^\uFEFF/, '');
        var rows = [], row = [], field = '', inQuotes = false, i, c;
        for (i = 0; i < text.length; i++) {
            c = text.charAt(i);
            if (inQuotes) {
                if (c === '"') {
                    if (text.charAt(i + 1) === '"') { field += '"'; i++; }
                    else inQuotes = false;
                } else field += c;
            } else if (c === '"') {
                inQuotes = true;
            } else if (c === ',') {
                row.push(field); field = '';
            } else if (c === '\n') {
                row.push(field); rows.push(row); row = []; field = '';
            } else if (c !== '\r') {
                field += c;
            }
        }
        if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
        var out = [];
        for (i = 0; i < rows.length; i++) {
            var r = rows[i], has = false;
            for (var j = 0; j < r.length; j++) {
                if (trim(r[j]) !== '') { has = true; break; }
            }
            if (has) out.push(r);
        }
        return out;
    }

    function csvToObjects(text) {
        var rows = parseCSVRows(text);
        if (!rows.length) return [];
        var header = [];
        for (var h = 0; h < rows[0].length; h++) header.push(trim(rows[0][h]));
        var objects = [];
        for (var i = 1; i < rows.length; i++) {
            var obj = {};
            for (var j = 0; j < header.length; j++) {
                obj[header[j]] = rows[i][j] !== undefined ? trim(rows[i][j]) : '';
            }
            objects.push(obj);
        }
        return objects;
    }

    function convertSheetUrl(u) {
        if (!u) return '';
        if (u.indexOf('hhttps') === 0) u = u.slice(1);
        if (u.indexOf('/pubhtml') !== -1) return u.replace('/pubhtml', '/pub?output=csv');
        return u.replace(/\/edit.*$/, '/export?format=csv');
    }

    var PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?'
    ];

    function loadURL(url, onok, onfail) {
        var candidates = [url];
        var i;
        for (i = 0; i < PROXIES.length; i++) {
            candidates.push(PROXIES[i] + encodeURIComponent(url));
        }
        var idx = 0;
        function attempt() {
            if (idx >= candidates.length) { if (onfail) onfail('No se pudo cargar: ' + url); return; }
            var xhr = new XMLHttpRequest();
            try { xhr.open('GET', candidates[idx], true); } catch (e) { idx++; attempt(); return; }
            xhr.timeout = 20000;
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) { if (onok) onok(xhr.responseText); }
                    else { idx++; attempt(); }
                }
            };
            xhr.ontimeout = function () { idx++; attempt(); };
            xhr.onerror = function () { idx++; attempt(); };
            xhr.send();
        }
        attempt();
    }

    function loadJSON(url, onok, onfail) {
        loadURL(url, function (text) {
            try { onok(JSON.parse(text)); }
            catch (e) { if (onfail) onfail('JSON inválido'); }
        }, onfail);
    }

    function loadText(url, onok, onfail) {
        loadURL(url, onok, onfail);
    }

    /* ==========================================================
       4. PROCESADORES DE DATOS (igual que la app pesada)
       ========================================================== */
    function findKey(obj, keywords) {
        var keys = [];
        for (var k in obj) { if (obj.hasOwnProperty(k)) keys.push(k); }
        for (var i = 0; i < keywords.length; i++) {
            var lower = keywords[i].toLowerCase();
            for (var j = 0; j < keys.length; j++) {
                if (keys[j].toLowerCase().indexOf(lower) !== -1) return keys[j];
            }
        }
        return null;
    }

    function procesarGuardias(objs) {
        var out = [];
        for (var i = 0; i < objs.length; i++) {
            var diaKey = findKey(objs[i], ['día', 'dia']);
            if (!diaKey) continue;
            var dia = trim(objs[i][diaKey]);
            if (!dia) continue;
            var diaNorm = normalizeDayName(dia);
            for (var t = 0; t < ORDEN_TRAMOS.length; t++) {
                var tramo = ORDEN_TRAMOS[t];
                var val = trim(objs[i][tramo]);
                if (val) {
                    var profes = val.split(';');
                    var lista = [];
                    for (var p = 0; p < profes.length; p++) {
                        var nom = trim(profes[p]);
                        if (nom) lista.push(nom);
                    }
                    if (lista.length) out.push({ dia: diaNorm, tramo: tramo, profesores: lista });
                }
            }
        }
        return out;
    }

    function procesarAusencias(objs) {
        var map = {};
        for (var i = 0; i < objs.length; i++) {
            var pKey = findKey(objs[i], ['profesor']);
            var fKey = findKey(objs[i], ['fecha']);
            var hKey = findKey(objs[i], ['hora']);
            var gKey = findKey(objs[i], ['grupo']);
            var aKey = findKey(objs[i], ['aula']);
            var tKey = findKey(objs[i], ['tarea']);
            var profesor = pKey ? trim(objs[i][pKey]) : null;
            var fecha = fKey ? formatToDDMMYYYY(objs[i][fKey]) : null;
            var hora = hKey ? trim(objs[i][hKey]).toUpperCase() : null;
            var grupo = gKey ? trim(objs[i][gKey]) : null;
            var aula = aKey ? trim(objs[i][aKey]) : null;
            var tarea = tKey ? trim(objs[i][tKey]) : null;
            if (!profesor || !fecha || !hora) continue;
            if (hora !== 'RECREO') {
                var num = parseInt(hora, 10);
                if (isNaN(num)) continue;
                hora = String(num);
            }
            var key = profesor + '_' + fecha;
            if (!map[key]) map[key] = { profesor: profesor, fecha: fecha, horas: {} };
            var reg = map[key];
            if (hora === 'RECREO') {
                reg.horas['RECREO'] = { grupo: grupo || '', zona: aula || '', tarea: tarea || '' };
            } else {
                reg.horas[hora] = { grupo: grupo || '', aula: aula || '', tarea: tarea || '' };
            }
        }
        var out = [];
        for (var k in map) { if (map.hasOwnProperty(k)) out.push(map[k]); }
        return out;
    }

    function procesarAlertas(objs) {
        var out = [];
        for (var i = 0; i < objs.length; i++) {
            var fIniKey = findKey(objs[i], ['fecha', 'fecha_inicio', 'fecha inicio', 'inicio']);
            var fFinKey = findKey(objs[i], ['fecha_fin', 'fecha fin', 'fin']);
            var hIniKey = findKey(objs[i], ['hora_inicio', 'hora inicio']);
            var hFinKey = findKey(objs[i], ['hora_fin', 'hora fin']);
            var mKey = findKey(objs[i], ['mensaje', 'descripcion', 'alerta']);
            var tKey = findKey(objs[i], ['tipo']);
            var aKey = findKey(objs[i], ['activo']);
            var fechaInicio = fIniKey ? trim(objs[i][fIniKey]) : '';
            var fechaFin = fFinKey ? trim(objs[i][fFinKey]) : '';
            fechaInicio = formatToDDMMYYYY(fechaInicio);
            if (fechaFin) fechaFin = formatToDDMMYYYY(fechaFin);
            out.push({
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                horaInicio: hIniKey ? trim(objs[i][hIniKey]) : '',
                horaFin: hFinKey ? trim(objs[i][hFinKey]) : '',
                mensaje: mKey ? trim(objs[i][mKey]) : '',
                tipo: tKey ? trim(objs[i][tKey]) : 'Info',
                activo: aKey ? trim(objs[i][aKey]).toUpperCase() : ''
            });
        }
        return out;
    }

    function procesarGaleria(objs) {
        var out = [];
        for (var i = 0; i < objs.length; i++) {
            if (!objs[i]) continue;
            var keys = [];
            for (var k in objs[i]) { if (objs[i].hasOwnProperty(k)) keys.push(k); }
            var url = null, titulo = '';
            for (var j = 0; j < keys.length; j++) {
                var v = trim(objs[i][keys[j]]);
                if (v.toLowerCase().indexOf('http') === 0) { url = v; break; }
            }
            if (!url) continue;
            var tituloKey = null;
            for (j = 0; j < keys.length; j++) {
                var lk = keys[j].toLowerCase();
                if (lk.indexOf('tit') !== -1 || lk.indexOf('nom') !== -1) { tituloKey = keys[j]; break; }
            }
            if (tituloKey) titulo = trim(objs[i][tituloKey]);
            if (!titulo) {
                for (j = 0; j < keys.length; j++) {
                    var v2 = trim(objs[i][keys[j]]);
                    if (v2 && v2 !== url && v2.length > 2) { titulo = v2; break; }
                }
            }
            if (url.indexOf('drive.google.com') !== -1) {
                var fileId = '';
                var m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                var m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                var m3 = url.match(/\/uc\?id=([a-zA-Z0-9_-]+)/);
                var m4 = url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
                if (m1 && m1[1]) fileId = m1[1];
                else if (m2 && m2[1]) fileId = m2[1];
                else if (m3 && m3[1]) fileId = m3[1];
                else if (m4 && m4[1]) fileId = m4[1];
                if (fileId) {
                    var driveLink = 'https://drive.google.com/uc?export=download&id=' + fileId;
                    url = 'https://images.weserv.nl/?url=' + encodeURIComponent(driveLink) + '&w=1920&q=80';
                }
            }
            out.push({ url: url, titulo: titulo });
        }
        return out;
    }

    /* ==========================================================
       5. ESTADO + CARGA DE DATOS
       ========================================================== */
    STATE = {
        guardias: [], guardiasPorTramo: {},
        ausencias: [], alertas: [], galeria: [],
        galIdx: 0,
        lastUpdate: null,
        alertasActivas: [], activeAlert: null, alertIndex: 0,
        screenList: [], screenIdx: 0,
        isGuardiaOverride: false, overrideLeft: 0,
        currentTramo: null, currentTramoIndex: -1, tramoProgress: 0,
        nextEvent: null, timeLeftSeconds: 0,
        rotStart: Date.now(), rotElapsed: 0,
        weather: null, weatherLoading: false, weatherError: null,
        rss: null, rssLoading: false, rssError: null
    };

    var marqueeX = 0, marqueeText = '';

    function restoreCache() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return;
            var c = JSON.parse(raw);
            if (c.ausencias) STATE.ausencias = c.ausencias;
            if (c.alertas) { STATE.alertas = c.alertas; computeAlertasActivas(); }
            if (c.galeria) STATE.galeria = c.galeria;
            if (c.guardias) {
                STATE.guardias = c.guardias;
                STATE.guardiasPorTramo = groupGuardias(c.guardias);
            }
            if (c.lastUpdate) STATE.lastUpdate = new Date(c.lastUpdate);
        } catch (e) { /* caché corrupta */ }
    }

    function storeCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                guardias: STATE.guardias,
                ausencias: STATE.ausencias,
                alertas: STATE.alertas,
                galeria: STATE.galeria,
                lastUpdate: STATE.lastUpdate ? STATE.lastUpdate.toISOString() : null
            }));
        } catch (e) { /* sin espacio */ }
    }

    function groupGuardias(raw) {
        var map = {};
        for (var i = 0; i < raw.length; i++) {
            var g = raw[i];
            if (!map[g.dia]) map[g.dia] = {};
            if (!map[g.dia][g.tramo]) map[g.dia][g.tramo] = [];
            map[g.dia][g.tramo].push({ profesores: g.profesores });
        }
        return map;
    }

    function loadData() {
        var pending = 0, anyOk = false;

        function done() {
            pending--;
            if (pending <= 0) {
                if (anyOk) {
                    STATE.lastUpdate = new Date();
                    storeCache();
                    updateStatusText();
                }
            }
        }

        function onGuardias(objs) {
            STATE.guardias = procesarGuardias(objs);
            STATE.guardiasPorTramo = groupGuardias(STATE.guardias);
            anyOk = true; done();
        }
        function onAusencias(objs) { STATE.ausencias = procesarAusencias(objs); anyOk = true; done(); }
        function onAlertas(objs) { STATE.alertas = procesarAlertas(objs); computeAlertasActivas(); anyOk = true; done(); }
        function onGaleria(objs) { STATE.galeria = procesarGaleria(objs); anyOk = true; done(); }

        function co(url) { return convertSheetUrl(url); }

        // Galería: si es imagen directa o archivo Drive, no parsear CSV
        function loadGaleria() {
            var u = cfg.urlGaleria;
            if (!u) { done(); return; }
            pending++;
            if (u.indexOf('drive.google.com/file') !== -1 || u.indexOf('drive.google.com/open') !== -1 || /\.(jpg|jpeg|png|webp|gif)/i.test(u)) {
                STATE.galeria = procesarGaleria([{ url: u }]);
                anyOk = true; done();
            } else {
                loadText(co(u), function (txt) { onGaleria(csvToObjects(txt)); }, done);
            }
        }

        // Modo "sin URLs": si estos campos están vacíos no cargamos esas fuentes
        pending = 1; // base
        function loadCsv(url, onok) {
            if (!url) { done(); return; }
            pending++;
            loadText(co(url), function (t) { onok(csvToObjects(t)); }, done);
        }

        loadCsv(cfg.urlGuardias, onGuardias);
        loadCsv(cfg.urlAusencias, onAusencias);
        loadCsv(cfg.urlAlertas, onAlertas);
        loadGaleria();

        done(); // decremento la base
    }

    /* ==========================================================
       6. BÚSQUEDA DE ALERTAS ACTIVAS (lógica de la app pesada)
       ========================================================== */
    function computeAlertasActivas() {
        var list = [];
        var now = new Date();
        var horaMin = now.getHours() * 60 + now.getMinutes();
        var i;
        for (i = 0; i < STATE.alertas.length; i++) {
            var a = STATE.alertas[i];
            var activo = trim(a.activo).replace(/[\u0300-\u036f]/g, '').toUpperCase();
            var esActivo = activo === 'SI' || activo === 'SÍ' || activo === 'TRUE' || activo === 'YES' || activo === '1' || activo === 'VERDADERO';
            if (!esActivo) continue;
            if (!a.fechaInicio) continue;
            var iniP = a.fechaInicio.split('/').map(Number);
            var ini = new Date(iniP[2], iniP[1] - 1, iniP[0]);
            var fin;
            if (a.fechaFin) {
                var finP = a.fechaFin.split('/').map(Number);
                fin = new Date(finP[2], finP[1] - 1, finP[0]);
            } else {
                fin = new Date(ini);
                var hIni = parseHM(a.horaInicio), hFin = parseHM(a.horaFin);
                if (hIni !== null && hFin !== null && hFin < hIni) fin.setDate(fin.getDate() + 1);
            }
            ini.setHours(0, 0, 0, 0);
            fin.setHours(23, 59, 59, 999);
            var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            if (hoy < ini || hoy > fin) continue;
            var esIni = hoy.getTime() === ini.getTime();
            var esFin = hoy.getTime() === fin.getTime();
            var hIni2 = parseHM(a.horaInicio), hFin2 = parseHM(a.horaFin);
            if (esIni && hIni2 !== null && horaMin < hIni2) continue;
            if (esFin && hFin2 !== null && horaMin >= hFin2) continue;
            list.push({ mensaje: a.mensaje || '', tipo: a.tipo || 'Info' });
        }
        STATE.alertasActivas = list;
        refreshAlert();
    }

    function parseHM(h) {
        if (!h) return null;
        var p = String(h).split(':');
        if (p.length < 2) return null;
        var hr = parseInt(p[0], 10), mi = parseInt(p[1], 10);
        if (isNaN(hr) || isNaN(mi)) return null;
        return hr * 60 + mi;
    }

    function refreshAlert() {
        var list = STATE.alertasActivas;
        var alumni = DOC.getElementById('alertBar');
        if (!list.length) {
            alumni.style.display = 'none';
            STATE.activeAlert = null;
            return;
        }
        alumni.style.display = 'block';
        var idx = STATE.alertIndex % list.length;
        STATE.activeAlert = list[idx];
        updateAlertBar();
        marqueeX = 0;
    }

    function alertStyles(tipo) {
        var t = (tipo || '').trim().toLowerCase();
        if (t === 'info') return { bg: '#2563eb', icon: 'ℹ️' };
        if (t === 'warning') return { bg: '#f59e0b', icon: '⚠️' };
        if (t === 'urgent') return { bg: '#dc2626', icon: '🚨' };
        return { bg: '#4b5563', icon: '📢' };
    }

    function updateAlertBar() {
        var a = STATE.activeAlert;
        if (!a) return;
        var st = alertStyles(a.tipo);
        DOC.getElementById('alertBar').style.background = st.bg;
        DOC.getElementById('alertIcon').textContent = st.icon;
        marqueeText = a.mensaje + '          •          ' + a.mensaje;
        var el = DOC.getElementById('alertText');
        el.textContent = marqueeText;
        marqueeX = 10;
        el.style.left = marqueeX + 'px';
    }

    /* ==========================================================
       7. HORARIO ESCOLAR (hook useSchoolSchedule)
       ========================================================== */
    function computeSchedule() {
        var horarios = cfg.horarios || [];
        var now = new Date();
        var secsTotal = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
        var idx = -1, i;
        for (i = 0; i < horarios.length; i++) {
            var s = hhmmToSec(horarios[i].inicio);
            var e = hhmmToSec(horarios[i].fin);
            if (secsTotal >= s && secsTotal < e) { idx = i; break; }
        }
        STATE.currentTramoIndex = idx;
        STATE.currentTramo = idx >= 0 ? horarios[idx] : null;
        if (STATE.currentTramo) {
            var s2 = hhmmToSec(STATE.currentTramo.inicio);
            var e2 = hhmmToSec(STATE.currentTramo.fin);
            STATE.tramoProgress = Math.min(Math.max((secsTotal - s2) / (e2 - s2), 0), 1);
        } else {
            STATE.tramoProgress = 0;
        }
        var hitos = [];
        for (i = 0; i < horarios.length; i++) {
            hitos.push({ time: hhmmToSec(horarios[i].inicio), label: horarios[i].tramo, type: 'INICIO' });
            hitos.push({ time: hhmmToSec(horarios[i].fin), label: horarios[i].tramo, type: 'FIN' });
        }
        var next = null;
        for (i = 0; i < hitos.length; i++) {
            if (hitos[i].time > secsTotal && (!next || hitos[i].time < next.time)) next = hitos[i];
        }
        STATE.nextEvent = next;
        STATE.timeLeftSeconds = next ? next.time - secsTotal : 0;
    }

    function hhmmToSec(h) {
        var p = String(h).split(':');
        return (parseInt(p[0], 10) * 60 + parseInt(p[1], 10)) * 60;
    }

    /* ==========================================================
       8. ROTACIÓN DE PANTALLAS + OVERRIDE DE GUARDIA
       ========================================================== */
    function buildScreenList() {
        var list = [];
        if (cfg.mostrarGuardias) list.push({ type: 'guardia' });
        if (cfg.mostrarAusencias) list.push({ type: 'ausencias' });
        if (cfg.mostrarResumen) list.push({ type: 'resumen' });
        if (cfg.mostrarGaleria && cfg.urlGaleria) list.push({ type: 'galeria' });
        if (cfg.rssEnabled && cfg.urlRss) list.push({ type: 'rss' });
        if (cfg.weatherEnabled && cfg.weatherLat && cfg.weatherLon) list.push({ type: 'tiempo' });
        return list;
    }

    function swapScreen(html, initFn) {
        VPORT.style.opacity = '0';
        window.setTimeout(function () {
            VPORT.innerHTML = html;
            if (initFn) initFn();
            VPORT.style.opacity = '1';
        }, 320);
    }

    function renderCurrent() {
        var list = STATE.screenList;
        if (!list.length) {
            swapScreen('<div class="screen">' +
                '<div class="scr-title">Kiosco I.E.S. Fuerte de Cortadura</div>' +
                '<div class="loading">No hay pantallas activas.<br/>Pulsa ⚙️ para configurar.</div></div>', null);
            return;
        }
        var idx = STATE.screenIdx % list.length;
        var item = list[idx];
        renderScreenType(item.type);
    }

    function renderScreenType(type) {
        if (type === 'guardia') renderGuardia();
        else if (type === 'ausencias') renderAusencias();
        else if (type === 'resumen') renderResumen();
        else if (type === 'galeria') renderGaleria();
        else if (type === 'rss') renderRSS();
        else if (type === 'tiempo') renderTiempo();
        else renderCurrent();
    }

    function scheduleRotation() {
        window.setInterval(function () {
            if (STATE.isGuardiaOverride) {
                DOC.getElementById('progressFillRot').style.width = '100%';
                return;
            }
            var list = STATE.screenList;
            if (list.length <= 1) { DOC.getElementById('progressFillRot').style.width = '100%'; return; }
            var elapsed = Date.now() - STATE.rotStart;
            var interval = Number(cfg.rotacionIntervalo) || 20000;
            var pct = Math.min(elapsed / interval, 1);
            DOC.getElementById('progressFillRot').style.width = (pct * 100) + '%';
            if (pct >= 1) {
                STATE.rotStart = Date.now();
                STATE.screenIdx = (STATE.screenIdx + 1) % list.length;
                renderCurrent();
            }
        }, 250);
    }

    var prevTramo = null;

    function checkTramoChange() {
        var id = STATE.currentTramo ? STATE.currentTramo.tramo : null;
        if (prevTramo === null) { prevTramo = id; return; }
        if (id !== prevTramo) {
            prevTramo = id;
            if (cfg.guardiaOverrideEnabled && hasGuardiaScreen()) {
                startOverride();
            }
        }
    }

    function hasGuardiaScreen() {
        for (var i = 0; i < STATE.screenList.length; i++) {
            if (STATE.screenList[i].type === 'guardia') return true;
        }
        return false;
    }

    function startOverride() {
        STATE.isGuardiaOverride = true;
        STATE.overrideLeft = Number(cfg.guardiaOverrideDuration) || 200;
        for (var i = 0; i < STATE.screenList.length; i++) {
            if (STATE.screenList[i].type === 'guardia') { STATE.screenIdx = i; break; }
        }
        comprobarOverrideTitulo();
        renderCurrent();
    }

    function cancelOverride() {
        STATE.isGuardiaOverride = false;
        STATE.overrideLeft = 0;
        renderCurrent();
    }

    function comprobarOverrideTitulo() {
        // Helper: cuenta atrás del override
        // (la barra ambar se gestiona en tickSec)
    }

    function tickSec() {
        // reloj
        var now = new Date();
        var hora = now.toTimeString ? pad2(now.getHours()) + ':' + pad2(now.getMinutes()) : '';
        var fecha = DIAS_SEMANA[now.getDay()] + ' ' + now.getDate();
        DOC.getElementById('relojHora').textContent = hora + ' | ' + fecha + ' de ' + MESES[now.getMonth()];

        computeSchedule();
        DOC.getElementById('progressFillTramo').style.width = (STATE.tramoProgress * 100) + '%';

        // próximo timbre
        var tb = DOC.getElementById('proximoTimbre');
        if (!STATE.nextEvent) {
            DOC.getElementById('timbreLabel').textContent = 'Próximo';
            DOC.getElementById('timbreValue').textContent = '—';
        } else {
            var left = STATE.timeLeftSeconds;
            var m = Math.floor(left / 60), s = Math.floor(left % 60);
            var texto;
            if (STATE.nextEvent.type === 'INICIO') {
                texto = (String(STATE.nextEvent.label).toUpperCase() === 'RECREO') ? 'Recreo' : ('Próximo: ' + STATE.nextEvent.label);
            } else {
                texto = 'Cambio de hora';
            }
            DOC.getElementById('timbreLabel').textContent = texto;
            DOC.getElementById('timbreValue').textContent = (m > 0 ? m + ' min' : s + ' seg');
        }

        // override countdown
        if (STATE.isGuardiaOverride) {
            STATE.overrideLeft--;
            DOC.getElementById('progressFillRot').style.width = '100%';
            DOC.getElementById('progressFillRot').style.background = '#f59e0b';
            var btn = DOC.getElementById('cancelOverride');
            if (btn) btn.textContent = '⏹ Cancelar Espera (' + Math.floor(STATE.overrideLeft / 60) + ':' + pad2(STATE.overrideLeft % 60) + ')';
            if (STATE.overrideLeft <= 0) {
                DOC.getElementById('progressFillRot').style.background = '#3b82f6';
                cancelOverride();
            }
        } else {
            DOC.getElementById('progressFillRot').style.background = '#3b82f6';
        }

        checkTramoChange();
        updateStatusText();
    }

    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    function updateStatusText() {
        var dot = DOC.getElementById('statusDot');
        var txt = DOC.getElementById('statusText');
        if (!STATE.lastUpdate) {
            dot.style.background = '#ef4444';
            txt.textContent = 'Sin datos';
            return;
        }
        var diffMin = (new Date().getTime() - STATE.lastUpdate.getTime()) / 60000;
        var color;
        if (diffMin < 5) color = '#22c55e';
        else if (diffMin < 30) color = '#eab308';
        else color = '#ef4444';
        dot.style.background = color;
        var lt = STATE.lastUpdate;
        txt.textContent = pad2(lt.getHours()) + ':' + pad2(lt.getMinutes());
        txt.style.color = color;
    }

    /* ==========================================================
       9. PANTALLAS
       ========================================================== */
    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* -------- GUARDIA -------- */
    function renderGuardia() {
        var html = '<div class="screen"><div class="screen-inner">';
        html += '<div class="scr-title">Cuadrante de Guardias I.E.S. "Fuerte de Cortadura"' + (STATE.isGuardiaOverride ? ' <span style="color:#f59e0b">— Modo Guardia</span>' : '') + '</div>';
        if (STATE.isGuardiaOverride) {
            html += '<div style="text-align:center"><button id="cancelOverride" class="cancelOverride" onclick="KioscoCancelOverride()">⏹ Cancelar Espera (' + Math.floor(STATE.overrideLeft / 60) + ':' + pad2(STATE.overrideLeft % 60) + ')</button></div>';
        }
        if (STATE.lastUpdate) {
        } else {
            html += '<div class="loading"><div class="spinner"></div>Cargando datos del cuadrante...</div>';
        }

        var now = new Date();
        var diaActual = DIAS_SEMANA[now.getDay()];
        var diaNorm = normalizeDayName(diaActual);
        var guardiasDeHoy = STATE.guardiasPorTramo[diaNorm] || {};
        var isEmpty = true;
        for (var k in guardiasDeHoy) { if (guardiasDeHoy.hasOwnProperty(k)) { isEmpty = false; break; } }

        if (isEmpty && STATE.lastUpdate) {
            html += '<div class="g-warning"><b>⚠️ No hay guardias para hoy (' + diaNorm + ')</b><span>Hoy es ' + diaNorm + '. Si es fin de semana, es normal no ver datos.</span></div>';
        }

        var horaActualMin = now.getHours() * 60 + now.getMinutes();
        var horarios = cfg.horarios || [];
        var i, h;
        var trap = STATE.currentTramo ? String(STATE.currentTramo.tramo) : null;

        var ausenciasHoy = [];
        var ts = todayStr();
        for (i = 0; i < STATE.ausencias.length; i++) {
            if (formatToDDMMYYYY(STATE.ausencias[i].fecha) === ts) ausenciasHoy.push(STATE.ausencias[i]);
        }

        html += '<table class="guardiaTable"><tr>' +
            '<th>Horario</th><th>Ausencias</th><th>Grupo</th><th>Aula</th><th>Tareas</th><th>Docentes de Guardia</th>' +
            '</tr>';

        var shown = 0;
        for (i = 0; i < horarios.length; i++) {
            h = horarios[i];
            var finMin = hhmmToSec(h.fin) / 60;
            if (finMin <= horaActualMin) continue;
            if (shown >= 6) break;
            shown++;
            var tramoId = String(h.tramo);
            var esActual = trap === tramoId;
            var esRecreo = tramoId === 'RECREO';
            var cls = 'class="' + (esActual ? 'current' : esRecreo ? 'recreo' : '') + '"';

            var ausTramo = [];
            for (var a = 0; a < ausenciasHoy.length; a++) {
                if (ausenciasHoy[a].horas && ausenciasHoy[a].horas[tramoId]) ausTramo.push(ausenciasHoy[a]);
            }
            var guardias = guardiasDeHoy[tramoId] || [];

            var ausCells = '';
            if (ausTramo.length) {
                for (a = 0; a < ausTramo.length; a++) {
                    ausCells += '<div class="g-aus" style="margin:3px 0">❌ ' + esc(ausTramo[a].profesor) + '</div>';
                }
            } else {
                ausCells = '<span class="g-sinAus">Sin ausencias</span>';
            }

            var grupoCells = '', aulaCells = '', tareaCells = '';
            for (a = 0; a < ausTramo.length; a++) {
                var slot = ausTramo[a].horas[tramoId];
                grupoCells += '<div><span class="g-grupo">' + esc(slot.grupo || '—') + '</span></div>';
                aulaCells += '<div><span class="g-aula">' + esc(esRecreo ? (slot.zona || '—') : (slot.aula || '—')) + '</span></div>';
                if (slot.tarea) tareaCells += '<div class="g-tarea" style="margin:3px 0">📝 ' + esc(slot.tarea) + '</div>';
            }

            var guardiaCells = '';
            var count = 0;
            for (var g = 0; g < guardias.length; g++) {
                var profs = guardias[g].profesores;
                for (var p = 0; p < profs.length; p++) {
                    guardiaCells += '<span class="g-guardiaNome">👨‍🏫 ' + esc(profs[p]) + '</span>';
                    count++;
                    if (count > 12) break;
                }
                if (count > 12) break;
            }
            if (!count) guardiaCells = '<span class="g-sinGuardia">Sin asignar</span>';

            html += '<tr ' + cls + '>' +
                '<td class="g-tramo">' + esc(tramoId) + (esActual ? '<span class="g-ahora">AHORA</span>' : '') + '<span class="g-hora">' + h.inicio + ' - ' + h.fin + '</span></td>' +
                '<td>' + ausCells + '</td>' +
                '<td>' + grupoCells + '</td>' +
                '<td>' + aulaCells + '</td>' +
                '<td>' + tareaCells + '</td>' +
                '<td class="g-guardia">' + guardiaCells + '</td>' +
                '</tr>';
        }

        if (!shown) {
            html += '<tr><td colspan="6"><div class="ausEmpty"><b>🏁 No quedan tramos horarios pendientes para hoy.</b></div></td></tr>';
        }
        html += '</table></div></div>';
        swapScreen(html, null);
    }

    /* -------- AUSENCIAS -------- */
    function renderAusencias() {
        var html = '<div class="screen"><div class="screen-inner">';
        html += '<div class="scr-title">📋 Ausencias del Profesorado</div>';

        var ts = todayStr();
        var idx = STATE.currentTramoIndex; // -1 si aún no empieza
        var ausHoy = [];
        var i;
        for (i = 0; i < STATE.ausencias.length; i++) {
            var a = STATE.ausencias[i];
            if (formatToDDMMYYYY(a.fecha) !== ts) continue;
            var tiene = false;
            for (var t in a.horas) {
                if (a.horas.hasOwnProperty(t) && ORDEN_TRAMOS.indexOf(t) >= idx) { tiene = true; break; }
            }
            if (tiene) ausHoy.push(a);
        }

        if (!ausHoy.length) {
            html += '<div class="ausEmpty"><span class="big">🎉</span><b>¡Sin ausencias pendientes!</b></div>';
        } else {
            html += '<div id="screenList">';
            for (i = 0; i < ausHoy.length && i < 12; i++) {
                var item = ausHoy[i];
                var nombre = item.profesor;
                if (nombre.indexOf(',') !== -1) {
                    nombre = nombre.split(',').map(function (p) { return trim(p); }).reverse().join(' ');
                }
                html += '<div class="ausCard"><div class="ausHeader"><span>❌</span>' + esc(nombre) + '</div>';
                var tramos = [];
                for (var t in item.horas) {
                    if (item.horas.hasOwnProperty(t) && ORDEN_TRAMOS.indexOf(t) >= idx) tramos.push(t);
                }
                tramos.sort(function (x, y) { return ORDEN_TRAMOS.indexOf(x) - ORDEN_TRAMOS.indexOf(y); });
                for (var ti = 0; ti < tramos.length; ti++) {
                    var tId = tramos[ti];
                    var slot = item.horas[tId];
                    var esRec = tId === 'RECREO';
                    html += '<div class="ausTramo' + (esRec ? ' recreo' : '') + '">' +
                        '<div class="ausTramoLabel"><small>' + (esRec ? '' : 'TRAMO') + '</small><span>' + (esRec ? '☕' : esc(tId)) + '</span></div>' +
                        '<div class="ausTramoInfo">';
                    if (esRec) {
                        html += '<span class="ausRecreo"><b>☕ RECREO</b> — Zona: ' + esc(slot.zona || '—') + '</span>';
                    } else {
                        html += '<span class="ausGrupo">' + esc(slot.grupo || '—') + '</span>' +
                            '<span class="ausAula">' + esc(slot.aula || '—') + '</span>';
                        if (slot.tarea) html += '<div class="ausTarea">📝 Tarea: ' + esc(slot.tarea) + '</div>';
                    }
                    html += '</div></div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div></div>';
        swapScreen(html, function () {
            if (ausHoy.length) startListScroll();
        });
    }

    /* -------- RESUMEN -------- */
    function renderResumen() {
        var now = new Date();
        var diaActual = DIAS_SEMANA[now.getDay()];
        var diaNorm = normalizeDayName(diaActual);
        var guardiasDeHoy = STATE.guardiasPorTramo[diaNorm] || {};
        var ts = todayStr();
        var idx = STATE.currentTramoIndex;

        var totalGuardias = 0;
        for (var d in guardiasDeHoy) {
            if (!guardiasDeHoy.hasOwnProperty(d)) continue;
            for (var tr in guardiasDeHoy[d]) {
                if (!guardiasDeHoy[d].hasOwnProperty(tr)) continue;
                var arr = guardiasDeHoy[d][tr];
                for (var g = 0; g < arr.length; g++) {
                    totalGuardias += arr[g].profesores.length;
                }
            }
        }

        var setAus = {}, ausPorTramo = {};
        var i;
        for (i = 0; i < STATE.ausencias.length; i++) {
            var a = STATE.ausencias[i];
            if (formatToDDMMYYYY(a.fecha) !== ts) continue;
            if (a.profesor) setAus[a.profesor] = true;
            for (var t in a.horas) {
                if (a.horas.hasOwnProperty(t) && ORDEN_TRAMOS.indexOf(t) >= idx) {
                    if (!ausPorTramo[t]) ausPorTramo[t] = {};
                    ausPorTramo[t][a.profesor] = true;
                }
            }
        }
        var totalAus = 0; for (var ap in setAus) { if (setAus.hasOwnProperty(ap)) totalAus++; }

        var html = '<div class="screen"><div class="screen-inner">';
        html += '<div class="scr-title">📊 Resumen del Día</div>';
        html += '<div class="resCards">' +
            '<div class="resCard" style="border-left-color:#f87171"><span class="ic">❌</span><span class="val" style="color:#f87171">' + totalAus + '</span><span class="lb">Docentes Ausentes</span></div>' +
            '<div class="resCard" style="border-left-color:#34d399"><span class="ic">👨‍🏫</span><span class="val" style="color:#34d399">' + totalGuardias + '</span><span class="lb">Docentes de Guardia</span></div>' +
            '</div>';

        var tramoKeys = [];
        for (var tk in ausPorTramo) { if (ausPorTramo.hasOwnProperty(tk)) tramoKeys.push(tk); }
        tramoKeys.sort(function (x, y) { return ORDEN_TRAMOS.indexOf(x) - ORDEN_TRAMOS.indexOf(y); });

        if (tramoKeys.length) {
            html += '<div class="resTramos"><div class="resTramosTitle">📋 Ausencias por Tramo</div>';
            for (i = 0; i < tramoKeys.length; i++) {
                var t = tramoKeys[i];
                var esRec = t === 'RECREO';
                html += '<div class="resTramo' + (esRec ? ' recreo' : '') + '">' +
                    '<div class="resTramoNum">' + (esRec ? '☕' : esc(t)) + '</div>' +
                    '<div class="resTramoProf">';
                for (var prof in ausPorTramo[t]) {
                    if (ausPorTramo[t].hasOwnProperty(prof)) {
                        var nm = prof;
                        if (nm.indexOf(',') !== -1) nm = nm.split(',').map(function (p) { return trim(p); }).reverse().join(' ');
                        html += '<p>• ' + esc(nm) + '</p>';
                    }
                }
                html += '</div></div>';
            }
            html += '</div>';
        }
        html += '</div></div>';
        swapScreen(html, null);
    }

    /* -------- GALERÍA -------- */
    function renderGaleria() {
        var html = '<div class="screen"><div class="galBox" id="galBox"></div></div>';
        swapScreen(html, function () {
            if (!STATE.galeria.length) {
                DOC.getElementById('galBox').innerHTML = '<div class="loading">Buscando imágenes en el Excel...</div>';
            } else {
                drawGaleria();
            }
        });
    }

    var galTimer = null;

    function drawGaleria() {
        var box = DOC.getElementById('galBox');
        if (!box) return;
        var item = STATE.galeria[STATE.galIdx % STATE.galeria.length];
        var html = '<div class="galImg fade" style="background-image:url(\'' + safeURL(item.url) + '\')"></div>';
        if (item.titulo) html += '<div class="galTitulo">' + esc(item.titulo) + '</div>';
        box.innerHTML = html;
        // crossfade
        var fs = box.firstChild;
        if (fs) fs.style.opacity = '0';
        window.setTimeout(function () { if (fs) fs.style.opacity = '1'; }, 50);
    }

    function safeURL(u) {
        return String(u).replace(/'/g, '%27').replace(/"/g, '%22');
    }

    function scheduleGaleria() {
        window.setInterval(function () {
            if (!STATE.galeria.length) return;
            if (STATE.screenList.length && STATE.screenList[STATE.screenIdx % STATE.screenList.length].type !== 'galeria') return;
            STATE.galIdx = (STATE.galIdx + 1) % STATE.galeria.length;
            drawGaleria();
        }, Number(cfg.galeriaIntervalo) || 7000);
    }

    /* -------- RSS -------- */
    function renderRSS() {
        var html = '<div class="screen"><div class="screen-inner">';
        html += '<div class="scr-title">' + esc(cfg.tituloRss || 'Noticias') + '</div>';
        if (STATE.rssLoading) {
            html += '<div class="loading"><div class="spinner"></div>Cargando noticias...</div>';
        } else if (STATE.rssError) {
            html += '<div class="error">⚠️ ' + esc(STATE.rssError) + '</div>';
        } else if (!STATE.rss || !STATE.rss.length) {
            html += '<div class="error">⚠️ No se pudieron cargar las noticias.</div>';
        } else {
            html += '<div id="screenList">';
            for (var i = 0; i < STATE.rss.length; i++) {
                var it = STATE.rss[i];
                var desc = it.description ? it.description.replace(/<[^>]*>/g, '').trim() : '';
                if (desc.length > 220) desc = desc.substring(0, 220) + '…';
                html += '<div class="rssCard">';
                if (it.thumbnail) html += '<div class="rssThumb" style="background-image:url(\'' + safeURL(it.thumbnail) + '\')"></div>';
                html += '<div class="rssBody">' +
                    '<div class="rssTitle">' + esc(it.title || '') + '</div>' +
                    (it.pubDate ? '<div class="rssDate">' + esc(it.pubDate) + '</div>' : '') +
                    (desc ? '<div class="rssDesc">' + esc(desc) + '</div>' : '') +
                    '</div>';
                if (it.link) {
                    html += '<div class="rssQr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=' + encodeURIComponent(it.link) + '" alt="QR"/><small>Leer en móvil</small></div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div></div>';
        swapScreen(html, function () {
            if (STATE.rss && STATE.rss.length) startListScroll();
        });
    }

    var rssTimer = null;

    function startListScroll() {
        if (rssTimer) window.clearInterval(rssTimer);
        var listEl = DOC.getElementById('screenList');
        if (!listEl) return;
        var dir = 1, paused = 0, scrollStart = null;
        rssTimer = window.setInterval(function () {
            if (!listEl) { window.clearInterval(rssTimer); return; }
            var maxScroll = Math.max(listEl.scrollHeight - listEl.clientHeight, 0);
            if (paused > 0) { paused--; return; }
            if (dir === 1) {
                listEl.scrollTop += 2;
                if (listEl.scrollTop >= maxScroll) { dir = -1; }
            } else {
                listEl.scrollTop -= 2;
                if (listEl.scrollTop <= 0) { dir = 1; paused = 2; }
            }
        }, 60);
    }

    function fetchRSS() {
        if (!cfg.urlRss) return;
        STATE.rssLoading = true;
        renderCurrent();
        var rssUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(cfg.urlRss);
        loadJSON(rssUrl, function (data) {
            if (data.status === 'ok') {
                STATE.rss = data.items || [];
                STATE.rssError = null;
            } else {
                STATE.rss = [];
                STATE.rssError = 'No se pudo parsear el feed RSS.';
            }
            STATE.rssLoading = false;
            if (isCurrent('rss')) renderRSS();
        }, function (err) {
            STATE.rss = [];
            STATE.rssError = 'Error al cargar las noticias.';
            STATE.rssLoading = false;
            if (isCurrent('rss')) renderRSS();
        });
    }

    function isCurrent(type) {
        var list = STATE.screenList;
        if (!list.length) return false;
        return list[STATE.screenIdx % list.length].type === type;
    }

    /* -------- TIEMPO -------- */
    var WMO = {
        '0': ['☀️', 'Despejado', '#fbbf24'],
        '1': ['⛅', 'Parcialmente Nublado', '#94a3b8'],
        '2': ['⛅', 'Parcialmente Nublado', '#94a3b8'],
        '3': ['☁️', 'Nublado', '#94a3b8'],
        '45': ['🌫️', 'Niebla', '#64748b'],
        '48': ['🌫️', 'Niebla', '#64748b'],
        '51': ['🌦️', 'Llovizna', '#60a5fa'],
        '53': ['🌦️', 'Llovizna', '#60a5fa'],
        '55': ['🌦️', 'Llovizna', '#60a5fa'],
        '61': ['🌧️', 'Lluvia', '#3b82f6'],
        '63': ['🌧️', 'Lluvia', '#3b82f6'],
        '65': ['🌧️', 'Lluvia', '#3b82f6'],
        '71': ['❄️', 'Nieve', '#e2e8f0'],
        '73': ['❄️', 'Nieve', '#e2e8f0'],
        '75': ['❄️', 'Nieve', '#e2e8f0'],
        '80': ['🌧️', 'Lluvia Intensa', '#1d4ed8'],
        '81': ['🌧️', 'Lluvia Intensa', '#1d4ed8'],
        '82': ['🌧️', 'Lluvia Intensa', '#1d4ed8'],
        '95': ['⛈️', 'Tormenta', '#f59e0b'],
        '96': ['⛈️', 'Tormenta', '#f59e0b'],
        '99': ['⛈️', 'Tormenta', '#f59e0b']
    };

    function wmoInfo(code) {
        var c = WMO[String(code)];
        return c ? { icon: c[0], label: c[1], color: c[2] } : { icon: '☁️', label: 'Nublado', color: '#94a3b8' };
    }

    function renderTiempo() {
        var html = '<div class="screen"><div class="screen-inner">';
        if (STATE.weatherLoading && !STATE.weather) {
            html += '<div class="loading"><div class="spinner"></div>Consultando satélites...</div>';
        } else if (STATE.weatherError && !STATE.weather) {
            html += '<div class="error">⚠️ ' + esc(STATE.weatherError) + '</div>';
        } else if (STATE.weather) {
            var w = STATE.weather;
            var cur = w.current;
            var info = wmoInfo(cur.weather_code);
            var rainProb = w.daily.precipitation_probability_mean ? w.daily.precipitation_probability_mean[0] : 0;
            html += '<div class="wCity">📍 ' + esc(cfg.weatherCity || 'Ubicación') + '</div>';
            html += '<div class="wMain">' +
                '<span class="wIcon" style="color:' + info.color + '">' + info.icon + '</span>' +
                '<span class="wDesc" style="color:' + info.color + '">' + info.label + '</span>' +
                '<span class="wTemp">' + Math.round(cur.temperature_2m) + '°</span>' +
                '<div class="wStats">' +
                '<span>💧 ' + cur.relative_humidity_2m + '% Humedad</span>' +
                '<span>🌬️ ' + cur.wind_speed_10m + ' km/h</span>' +
                '<span style="color:#60a5fa;font-weight:bold">☔ ' + rainProb + '% Lluvia hoy</span>' +
                '</div></div>';
            html += '<div class="wForecast"><div class="wFTitle">📅 Próximos 3 Días</div>';
            var MESESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            for (var i = 0; i < 3 && i < w.daily.time.length; i++) {
                var d = w.daily.time[i];
                var dObj = new Date(d + 'T00:00:00');
                var esHoy = i === 0;
                var nombre = esHoy ? 'Hoy' : capitalizar(DIAS_SEMANA[dObj.getDay()]);
                var ic = wmoInfo(w.daily.weather_code[i]);
                html += '<div class="wCard' + (esHoy ? ' today' : '') + '">' +
                    '<div class="d">' + nombre + '</div>' +
                    '<span class="ic" style="color:' + ic.color + '">' + ic.icon + '</span>' +
                    '<span class="tMax">' + Math.round(w.daily.temperature_2m_max[i]) + '°</span>' +
                    '<span class="tMin">' + Math.round(w.daily.temperature_2m_min[i]) + '°</span>' +
                    '</div>';
            }
            html += '</div>';
        } else {
            html += '<div class="loading"><div class="spinner"></div>Cargando tiempo...</div>';
        }
        html += '</div></div>';
        swapScreen(html, null);
    }

    function capitalizar(s) {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function fetchWeather() {
        if (!cfg.weatherEnabled || !cfg.weatherLat || !cfg.weatherLon) return;
        STATE.weatherLoading = true;
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + cfg.weatherLat +
            '&longitude=' + cfg.weatherLon +
            '&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m' +
            '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_mean&timezone=auto';
        loadJSON(url, function (data) {
            if (!data.current || !data.daily) {
                STATE.weatherError = 'Datos incompletos de la API.';
            } else {
                STATE.weather = data;
                STATE.weatherError = null;
            }
            STATE.weatherLoading = false;
            if (isCurrent('tiempo')) renderTiempo();
        }, function () {
            STATE.weatherError = 'No se pudo cargar el tiempo.';
            STATE.weatherLoading = false;
            if (isCurrent('tiempo')) renderTiempo();
        });
    }

    /* ==========================================================
       10. MARQUEE DE ALERTAS + ROTACIÓN DE MENSAJES
       ========================================================== */
    function scheduleMarquee() {
        window.setInterval(function () {
            var el = DOC.getElementById('alertText');
            if (!STATE.activeAlert || !el || DOC.getElementById('pinModal').style.display !== 'none') return;
            marqueeX -= 2;
            var vw = DOC.getElementById('alertMarquee').clientWidth;
            var tw = el.offsetWidth;
            if (marqueeX + tw < 10) marqueeX = vw;
            el.style.left = marqueeX + 'px';
        }, 25);
    }

    function scheduleAlertRotation() {
        window.setInterval(function () {
            if (STATE.alertasActivas.length <= 1) return;
            STATE.alertIndex++;
            refreshAlert();
        }, 5000);
    }

    /* ==========================================================
       11. MODALES PIN + CONFIG
       ========================================================== */
    function bindModals() {
        DOC.getElementById('configBtn').addEventListener('click', function () {
            DOC.getElementById('pinModal').style.display = 'block';
        });
        DOC.getElementById('pinCancel').addEventListener('click', closePin);
        DOC.getElementById('pinOk').addEventListener('click', checkPin);
        DOC.getElementById('pinInput').addEventListener('keydown', function (e) {
            if (e.keyCode === 13) checkPin();
        });
        DOC.getElementById('cfgClose').addEventListener('click', function () {
            DOC.getElementById('configModal').style.display = 'none';
        });
        DOC.getElementById('cfgSave').addEventListener('click', saveConfigFromForm);
    }

    function closePin() {
        DOC.getElementById('pinModal').style.display = 'none';
        DOC.getElementById('pinError').style.display = 'none';
        DOC.getElementById('pinInput').value = '';
    }

    function checkPin() {
        var pin = DOC.getElementById('pinInput').value;
        if (String(pin) === String(cfg.adminPin)) {
            closePin();
            openConfig();
        } else {
            DOC.getElementById('pinError').style.display = 'block';
            DOC.getElementById('pinInput').value = '';
        }
    }

    function openConfig() {
        DOC.getElementById('cfgUrlGuardias').value = cfg.urlGuardias || '';
        DOC.getElementById('cfgUrlAusencias').value = cfg.urlAusencias || '';
        DOC.getElementById('cfgUrlAlertas').value = cfg.urlAlertas || '';
        DOC.getElementById('cfgUrlGaleria').value = cfg.urlGaleria || '';
        DOC.getElementById('cfgRssEnabled').checked = !!cfg.rssEnabled;
        DOC.getElementById('cfgUrlRss').value = cfg.urlRss || '';
        DOC.getElementById('cfgTituloRss').value = cfg.tituloRss || '';
        DOC.getElementById('cfgWeatherEnabled').checked = !!cfg.weatherEnabled;
        DOC.getElementById('cfgWeatherLat').value = cfg.weatherLat || '';
        DOC.getElementById('cfgWeatherLon').value = cfg.weatherLon || '';
        DOC.getElementById('cfgWeatherCity').value = cfg.weatherCity || '';
        DOC.getElementById('cfgMostrarGuardias').checked = cfg.mostrarGuardias !== false;
        DOC.getElementById('cfgMostrarAusencias').checked = cfg.mostrarAusencias !== false;
        DOC.getElementById('cfgMostrarResumen').checked = cfg.mostrarResumen !== false;
        DOC.getElementById('cfgMostrarGaleria').checked = !!cfg.mostrarGaleria;
        DOC.getElementById('cfgGaleriaIntervalo').value = (cfg.galeriaIntervalo / 1000) || 7;
        DOC.getElementById('cfgRotacion').value = (cfg.rotacionIntervalo / 1000) || 20;
        DOC.getElementById('cfgActualizacion').value = (cfg.actualizacionDatos / 1000) || 60;
        DOC.getElementById('cfgGuardiaOverride').checked = cfg.guardiaOverrideEnabled !== false;
        DOC.getElementById('cfgOverrideDur').value = cfg.gardiaOverrideDuration || 200;
        DOC.getElementById('cfgAdminPin').value = cfg.adminPin || '';
        DOC.getElementById('configModal').style.display = 'block';
    }

    function saveConfigFromForm() {
        cfg.urlGuardias = DOC.getElementById('cfgUrlGuardias').value.trim() || cfg.urlGuardias;
        cfg.urlAusencias = DOC.getElementById('cfgUrlAusencias').value.trim() || cfg.urlAusencias;
        cfg.urlAlertas = DOC.getElementById('cfgUrlAlertas').value.trim() || cfg.urlAlertas;
        cfg.urlGaleria = DOC.getElementById('cfgUrlGaleria').value.trim() || cfg.urlGaleria;
        cfg.rssEnabled = DOC.getElementById('cfgRssEnabled').checked;
        cfg.urlRss = DOC.getElementById('cfgUrlRss').value.trim() || cfg.urlRss;
        cfg.tituloRss = DOC.getElementById('cfgTituloRss').value.trim() || cfg.tituloRss;
        cfg.weatherEnabled = DOC.getElementById('cfgWeatherEnabled').checked;
        cfg.weatherLat = DOC.getElementById('cfgWeatherLat').value.trim() || cfg.weatherLat;
        cfg.weatherLon = DOC.getElementById('cfgWeatherLon').value.trim() || cfg.weatherLon;
        cfg.weatherCity = DOC.getElementById('cfgWeatherCity').value.trim() || cfg.weatherCity;
        cfg.mostrarGuardias = DOC.getElementById('cfgMostrarGuardias').checked;
        cfg.mostrarAusencias = DOC.getElementById('cfgMostrarAusencias').checked;
        cfg.mostrarResumen = DOC.getElementById('cfgMostrarResumen').checked;
        cfg.mostrarGaleria = DOC.getElementById('cfgMostrarGaleria').checked;
        cfg.galeriaIntervalo = (Number(DOC.getElementById('cfgGaleriaIntervalo').value) || 7) * 1000;
        cfg.rotacionIntervalo = (Number(DOC.getElementById('cfgRotacion').value) || 20) * 1000;
        cfg.actualizacionDatos = (Number(DOC.getElementById('cfgActualizacion').value) || 60) * 1000;
        cfg.gardiaOverrideEnabled = DOC.getElementById('cfgGuardiaOverride').checked;
        cfg.gardiaOverrideDuration = Number(DOC.getElementById('cfgOverrideDur').value) || 200;
        cfg.adminPin = DOC.getElementById('cfgAdminPin').value.trim() || cfg.adminPin;

        saveConfig();
        DOC.getElementById('configModal').style.display = 'none';

        resetApp();
    }

    function resetApp() {
        STATE.screenList = buildScreenList();
        STATE.screenIdx = 0;
        STATE.rotStart = Date.now();
        STATE.weather = null;
        STATE.rss = null;
        if (rssTimer) { window.clearInterval(rssTimer); rssTimer = null; }
        restartDataIntervals();
        loadData();
        if (cfg.rssEnabled) fetchRSS();
        if (cfg.weatherEnabled) fetchWeather();
        renderCurrent();
        computeAlertasActivas();
    }

    var dataTimer = null;
    function restartDataIntervals() {
        if (dataTimer) window.clearInterval(dataTimer);
        var interval = Number(cfg.actualizacionDatos) || 60000;
        dataTimer = window.setInterval(function () {
            loadData();
            if (cfg.rssEnabled) fetchRSS();
            if (cfg.weatherEnabled) fetchWeather();
        }, interval);
    }

    /* ==========================================================
       12. ARRANQUE
       ========================================================== */
    function boot() {
        // favicon opcional
        restoreCache();

        DOC.getElementById('configBtn').tabIndex = 0;
        bindModals();

        STATE.screenList = buildScreenList();
        STATE.rotStart = Date.now();

        // Ticks
        scheduleRotation();
        window.setInterval(tickSec, 1000);
        scheduleMarquee();
        scheduleAlertRotation();
        scheduleGaleria();
        // Refresco de pantallas sensibles al tiempo
        window.setInterval(function () {
            var list = STATE.screenList;
            if (!list.length || DOC.getElementById('pinModal').style.display !== 'none') return;
            var t = list[STATE.screenIdx % list.length].type;
            if (t === 'guardia' || t === 'ausencias' || t === 'resumen') renderCurrent();
        }, 10000);

        dataTimer = window.setInterval(function () {
            loadData();
            if (cfg.rssEnabled) fetchRSS();
            if (cfg.weatherEnabled) fetchWeather();
        }, Number(cfg.actualizacionDatos) || 60000);

        loadData();
        if (cfg.rssEnabled) fetchRSS();
        if (cfg.weatherEnabled) fetchWeather();
        renderCurrent();
        reflectDarkMode();
    }

    function reflectDarkMode() {
        if (cfg.darkMode === false) {
            DOC.body.style.background = '#f8fafc';
        }
    }

    // Exponer función global para el botón cancelar override (inline onclick)
    window.KioscoCancelOverride = cancelOverride;

    if (DOC.readyState === 'loading') {
        DOC.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();