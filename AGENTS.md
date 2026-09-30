# AGENTS.md — Kiosco Cortadura (dist V3)

Kiosco escolar (IES Fuerte de Cortadura) para Smart TV con WebKit antiguo. La rama `distV3` (orphan) es la que sirve GitHub Pages desde la raíz. No build, no tests, no lint: deploy = push a `distV3`, la verificación es manual en un navegador.

## Reglas duras
- **Esta carpeta es el trabajo**: `E:\KioscoApp-TVandroid_v2\dist V3` es un clone de una sola rama (`--single-branch --branch distV3`) y su raíz es la raíz de la rama. Toca solo los archivos de aquí: `app.js`, `index.html`, `styles.css`, `GUIA_TV_ENGEL.md`, `README.md`, `AGENTS.md`, `.gitattributes`, `assets/`.
- **No toques la carpeta padre** `E:\KioscoApp-TVandroid_v2`: es otro checkout más antiguo (con cambios sin commitear en `app.js`/`index.html`/`styles.css`/`GUIA_TV_ENGEL.md` y carpetas `dist V1`…`dist V3`). Y **nunca `master`** (app Expo/React Native completa, obsoleta para este kiosco).
- `app.js` es **ES5** (prohibido `let`/`const`/flechas/template literals/`fetch`/`Promise.allSettled`) y el CSS debe valer para el WebKit viejo de las TV Linux (Engel): sin Grid, sin flex `gap`, sin `backdrop-filter`. Método de carga: `XMLHttpRequest` (`loadURL`, app.js:309).
- Tras cambiar `app.js` o `styles.css`, incrementa su cache-buster en `index.html` (`app.js?v12`, `styles.css?v10`) y recarga con Ctrl+F5. Sin bump, la TV sigue con el código viejo.
- Los parámetros de URL se re-aplican en cada carga y tienen prioridad sobre la config guardada (`applyURLConfig`, app.js:88). Deben ir en la URL raíz (`https://…/?demo=1`), jamás en `…/index.html?demo=1` (el servidor redirige y pierde la query).
- Intervalos por URL en **segundos**, en config en **ms** (app.js:99).
- Idioma de UI, docs y commits: español.

## Despliegue
- GitHub Pages está en modo **Deploy from a branch**: rama `distV3`, carpeta `/ (root)`, y `distV3` es la rama por defecto del repo. No hay workflow: `deploy = push a distV3`.
- El build **solo se dispara al hacer push**, no al cambiar la configuración (cambiar el Source no reconstruye nada). Tarda 1-2 min.
- Para comprobar que la web va actualizada: `https://juanjogue.github.io/kiosko_cortadura-v3/` y mirar el `?vN` del `app.js`/`styles.css` en el `index.html` servido (debe coincidir con el local, y con lo quepedimos en la TV).
- `master` contiene la app Expo/React Native antigua: no desplegar ni tocar.

## Vista previa local
- Servidor estático desechable desde esta carpeta: `python -m http.server 8123` → <http://127.0.0.1:8123/>. Con `file://` no funciona (XHR y CSP).
- Atajos: `?demo=1` renderiza todo con datos ficticios; `?demo=manana` fija el reloj a las 10:25; `?noidle=1` salta la pantalla de reposo. Para recargar saltándote la caché del navegador, añade un parámetro cualquiera (`&_=42`).
- En local conviene `?noidle=1` si estás fuera del horario lectivo, si no solo verás el reloj de reposo.

## Datos y acentos (bug resuelto — no reintroducir)
- La hoja de Google guarda `miercoles` sin tilde pero el código usa `Miércoles`. Comparar días/nombres SIEMPRE pasando por `quitarAcentos()` (convierte vocales PRECOMPUESTAS U+00E9, no basta borrar marcas combinables U+0300–U+036f), vía `normalizeDayName` (app.js:172) / `normNombreKey` (app.js:190). Síntoma del bug: "no aparecen los docentes de guardia".
- Fuentes: CSV de Google Sheets (`/pub?output=csv`; para ausencias, `?gid=1604837414&single=true&output=csv`). `convertSheetUrl` (app.js:278) añade `_cb=timestamp` para saltar la caché de Google (~5 min).
- `esURLFuente()` (app.js:293) decide qué URLs se aceptan: solo Sheets/Drive/CSV/imágenes con `http(s)://`.
- CORS: **no hay proxy** — `proxy.php` se eliminó (no se ejecuta en GitHub Pages y todas las fuentes envían `Access-Control-Allow-Origin: *`). `PROXIES` está vacío (app.js:307) y `loadURL` descarga directo; no volver a añadir proxies.
- `.gitattributes` fija `eol=lf`: escribe siempre LF, no CRLF, o aparece el aviso "LF will be replaced by CRLF" al hacer `git add` (el repo tiene `core.autocrlf=true`).

## Persistencia y operativa
- localStorage: `kiosco_config`, `kiosco_data_cache` (últimos datos; sin internet se muestra caché), `kiosco_last_autoreload`.
- Recarga automática nocturna a las **03:00** (limpia memoria del WebKit).
- Pantalla de reposo fuera del horario `idleInicio`/`idleFin` (08:00–14:50) y los fines de semana; `?noidle=1` la desactiva.
- Modos demo (rápido para renderizar todo sin hojas reales, marquesina avisa "DATOS FICTICIOS"): `?demo=1` (horario deslizante) y `?demo=manana` (reloj ficticio 10:25, tramo 3 "AHORA"). `demo`/`noidle` nunca se persisten.
- Arquitectura mínima: `boot()` (app.js:2005) arranca; `loadData()` (730) descarga; `groupGuardias` (593) indexa guardias por día/tramo; `renderCurrent` (1012) / `renderResumen` (1435) / `renderActividades` (1518) pintan; `startListScroll` (1658) hace el auto-scroll de las listas. `app.js` es una IIFE con dependencias de DOM: difícil de testear aislada (el harness usado en su día fue ad hoc y temporal).

## Decisiones ya tomadas (no son bugs, no "arreglar")
- La hoja de guardias tiene **nombres duplicados en la misma celda** (tramo 4: "Malia Carpio, Manuela" x2; tramo 5: "Fuentes Gallego, María Begoña" x2). Es **intencionado**: `renderResumen` cuenta asignaciones (19), no docentes distintos (17). No deduplicar en código ni "limpiar" la hoja.
- La columna `width: 130px` de `.actFecha` y el `margin-left: 130px` de `.actInfo` (styles.css) están acoplados a propósito: si cambias uno, cambia el otro.

## Referencias
- `README.md` (en el repo): descripción, parámetros de URL, columnas de cada hoja, despliegue.
- `GUIA_TV_ENGEL.md` (en el repo): despliegue en la TV Engel, ajustes recomendados, troubleshooting.
