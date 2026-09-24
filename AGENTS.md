# AGENTS.md — Kiosco Cortadura (dist V3)

Kiosco escolar (IES Fuerte de Cortadura) para Smart TV con WebKit antiguo. Orphan branch `distV3` served by GitHub Pages from the root. No build, no tests, no lint: deploy = push to `distV3`, verification is manual in a browser.

## Reglas duras
- Trabaja SOLO en `distV3`, tocando únicamente los archivos de la raíz: `app.js`, `index.html`, `styles.css`, `proxy.php`, `GUIA_TV_ENGEL.md`, `assets/`. **Nunca tocar `master`** (app Expo/React Native completa; contiene la carpeta `dist V3/` obsoleta).
- `app.js` es **ES5** (prohibido `let`/`const`/flechas/template literals/`fetch`/`Promise.allSettled`) y el CSS debe valer para el WebKit viejo de las TV Linux (Engel). Método de carga: `XMLHttpRequest` (ver `loadURL`, app.js:311).
- Tras cambiar `app.js` o `styles.css`, incrementa su cache-buster en `index.html` (`app.js?v9`, `styles.css?v7`) y recarga la TV con Ctrl+F5. Sin bump, la TV sigue con el código viejo.
- Los parámetros de URL se re-aplican en cada carga y tienen prioridad sobre la config guardada (`applyURLConfig`, app.js:88). Deben ir en la URL raíz (`https://…/?demo=1`), jamás en `…/index.html?demo=1` (el servidor redirige y pierde la query).
- Intervalos por URL en **segundos**, en config en **ms** (app.js:99).
- Idioma de UI y commits: español.

## Datos y acentos (bug resuelto — no reintroducir)
- La hoja de Google guarda `miercoles` sin tilde pero el código usa `Miércoles`. Comparar días/nombres SIEMPRE pasando por `quitarAcentos()` (convierte vocales PRECOMPUESTAS U+00E9, no basta borrar marcas combinables U+0300–U+036f), vía `normalizeDayName` / `normNombreKey` (app.js:160-199). Síntoma del bug: "no aparecen los docentes de guardia".
- Fuentes: CSV de Google Sheets (`/pub?output=csv`; para ausencias, `?gid=1604837414&single=true&output=csv`). `convertSheetUrl` (app.js:278) añade `_cb=timestamp` para saltar la caché de Google (~5 min).
- `esURLFuente()` (app.js:293) decide qué URLs se aceptan: solo Sheets/Drive/CSV/imágenes con `http(s)://`.
- CORS: primero descarga directa, respaldo `proxy.php?url=` del mismo host (`PROXIES`, app.js:307). Los proxies públicos (allorigins, corsproxy.io…) están muertos y **se retiraron a propósito**; no volver a añadirlos.
- `proxy.php`: whitelist de dominios (docs.google.com, drive.google.com, weserv, open-meteo, rss2json); responde 204 a OPTIONS.

## Persistencia y operativa
- localStorage: `kiosco_config`, `kiosco_data_cache` (últimos datos; sin internet se muestra caché), `kiosco_last_autoreload`.
- Recarga automática nocturna a las **03:00** (limpia memoria del WebKit).
- Pantalla de reposo fuera del horario `idleInicio`/`idleFin` (08:00–14:50) y los fines de semana; `?noidle=1` la desactiva.
- Modos demo (rápido para renderizar todo sin hojas reales, marquesina avisa "DATOS FICTICIOS"): `?demo=1` (horario deslizante) y `?demo=manana` (reloj ficticio 10:25, tramo 3 "AHORA"). `demo`/`noidle` nunca se persisten.
- Arquitectura mínima: `boot()` (app.js:2002) arranca; `loadData()` (732) descarga; `groupGuardias` (595) indexa guardias por día/tramo; `renderCurrent`/`renderResumen` (1435) pintan. `app.js` es una IIFE con dependencias de DOM: difícil de testear aislada (el harness usado en su día fue ad hoc y temporal).

## Pendiente conocido
- La hoja de guardias tiene **nombres duplicados en la misma celda** (tramo 4: "Malia Carpio, Manuela" x2; tramo 5: "Fuentes Gallego, María Begoña" x2). `renderResumen` cuenta asignaciones (19) ≠ docentes distintos (17). Decisión abierta del usuario: deduplicar en la hoja o en código.

## Referencias
- `GUIA_TV_ENGEL.md` (en el repo): despliegue, parámetros de URL completos, troubleshooting.
- `…\..\NOTAS_CONVERSACION_KIOSCO.md` (fuera del repo): historial de revisión/fixes 2026-09.