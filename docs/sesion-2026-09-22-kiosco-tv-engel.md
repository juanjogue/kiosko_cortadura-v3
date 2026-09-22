# Sesión 3: Kiosco TV Engel (dist V3) — 22/09/2026

> Continuación de `sesion-2026-09-21-kiosco-tv-engel-2.md`. Legibilidad de
> fuentes, fijar CORS para Google Sheets, hoja de ausencias nueva (formato
> ancho), proxy propio y despliegue. Commit final: `cd374db`.
> Repo nuevo: `juanjogue/kiosko_cortadura-v3` (sustituye a `sitio_web_cortadura`).

---

## Contexto

- Trabajamos sobre `dist V3/`. En esta sesión se sirvió local con
  `python -m http.server 8080` (PID 3996, seguía activo al cerrar) en vez de
  `file://` o servir del folder (ningún servidor local quedó nada en la sesión…).
- Despliegue real: **https://cortadura.atwebpages.com/** (Hostinger free).
- Commit base de la sesión: `57b9236`.

## Cambios aplicados (todos en `dist V3/`)

### Legibilidad: fuentes escaladas ×1.43
- Todas las `font-size` en px de `styles.css` multiplicadas por ~1,43 (primero
  +30% y después +10%). `line-height` dependientes también escalados; los de
  60px (barra de alertas) y 52px (`#configBtn`) se dejaron por alturas fijas.

### Hoja de ausencias nueva + parser formato ancho
- La hoja antigua (`gid=2111711524`) estaba **vacía**; la del formulario real
  (`gid=1604837414`) usa el formato ancho:
  `Docente, Fecha de ausencia, 1ª HORA GRUPO/AULA/TAREA … 6ª HORA`,
  `RECREO, ZONA RECREO, OBSERVACION PARA TENER EN CUENTA EN EL RECREO`.
- `procesarAusenciasWide()` parsea ese formato (regex
  `/(\d)\s*ª\s*HORA\s+(GRUPO|AULA|TAREA)/i`); el formato largo clásico sigue
  soportado. Validado con datos reales vía harness de Node (parsing = 2 filas
  correctas: Cordeiro 5ª+6ª, Asegurado 6ª).
- `urlAusencias` por defecto actualizada (app.js:36).

### Resumen
- Añadida tercera tarjeta **"🛡️ Ausentes con Guardia"** (ámbar), cruzando por
  nombre normalizado (`normNombreKey`: sin acentos, tokens ordenados).
- Eliminada la tarjeta anterior "Docentes Ausentes Hoy" y el nombre del profesor
  en la columna tareas de guardias (`.g-tareaProf`), para dar espacio.

### Arranque
- Eliminado el override forzado a modo guardia al arrancar: el override solo
  actúa al **cambiar de tramo** en vivo.

### CORS para Google Sheets (diagnóstico y solución)
- Causa: abrir por `file://` → `Origin: null` → Google **no** envía
  `Access-Control-Allow-Origin` en el 307 → XHR bloqueado. Sirviendo por HTTPS
  con origen real (localhost o el dominio), Google **sí** lo envía
  (verificado: 307 con `ACAO: https://cortadura.atwebpages.com` + final 200).
- Proxies públicos muertos (todo 2026): `api.allorigins.win` (522),
  `corsproxy.io` (403/401, pide API key), `api.codetabs.com` (522),
  `test.cors.workers.dev`/`api.cors.lol` (429).
- **`proxy.php` (nuevo)**: proxy CORS server-side del MISMO host (sin CORS),
  válido para atwebpages (PHP). Allowlist de dominios (docs.google.com,
  sheets.googleusercontent.com, drive.google.com, images.weserv.nl,
  api.open-meteo.com, api.rss2json.com), sigue redirecciones (cURL o
  file_get_contents), decodifica `url` aunque venga sin encodear.
  Conectado como **primer proxy de respaldo** en `PROXIES` (directo →
  proxy.php → allorigins → corsproxy).
  ⚠️ En atwebpages devuelve **403 Forbidden** (o no llegó bien subido o el plan
  no ejecuta PHP). **No bloqueante**: la descarga directa HTTPS funciona.
  Solo haría falta si la TV fallara por CORS.
- Cache-buster: `styles.css`/`app.js` ahora con **`?v7`** (v3→v4→v5…).

### Modo reposo (importante para la TV)
- Fuera de 08:00–14:50 (`idleInicio`/`idleFin`) la app **solo muestra el reloj**;
  por diseño. Para ver pantallas fuera de horario: `?noidle=1`.
  La sesión terminó pensando que "las ausencias no funcionaban" y ERA el reposo.

### Ventana de configuración
- Scroll vertical: `#configModal { overflow-y: auto }` y `.configBox` sin
  `height:100%` (la caja crece y scrollea el modal completo, más fiable en el
  WebKit viejo que un scroll anidado).

### Instrumentación (añadida y retirada en la misma sesión)
- Para diagnosticar lo de "sin ausencias" se añadió `?debug=1` (panel amarillo
  con filas/parseadas/fecha/tramo) y se **eliminó** al confirmar la causa.
  idea para futuras: repetir si vuelve a fallar la carga.

## Despliegue / verificación en atwebpages
- `app.js` desplegado verificado **byte a byte idéntico** al local (90885 B).
- CSV de ausencias real (22/09/2026): 2 filas (Cordeiro 5ª/6ª, Asegurado 6ª),
  con tareas de prueba larguísimas en la hoja.
- Pruebas: `/?v4&ausencias=1&…`, `/?v5&noidle=1&debug=1&…` → dato visible.
- Certificado de cortadura.atwebpages.com no fiable para schannel de Windows
  (cURL `-k`); en navegador/TV se acepta.

## Repo Git
- Remote actualizado: `origin → https://github.com/juanjogue/kiosko_cortadura-v3.git`
  (el antiguo `sitio_web_cortadura.git` daba 404).
- Push bloqueado al principio: credencial de Windows era de **`ermendaa`**
  (403); el dueño la añadió como colaboradora y se hizo push OK.
- Commit final: **`cd374db`** — "dist V3: proxy CORS propio proxy.php como
  respaldo, scroll vertical en ventana de configuracion, cache-buster v7"
  (4 archivos, +90/−4). Push: `master` nueva en el repo.

## Pendientes / próximos pasos sugeridos

1. **Subir la última versión al hosting** (index.html, app.js, styles.css con
   `?v7`) y probar en la TV **en horario lectivo** (las ausencias solo se ven
   dentro de 08:00–14:50 salvo `noidle=1`).
2. **`proxy.php`**: decidir si se necesita (si la TV carga directo, no). Si se
   quiere en atwebpages, revisar por qué da 403 (permisos/subida/plan).
3. La hoja de ausencias tiene **tareas de prueba** muy largas: limpiarlas
   cuando toque.
4. `gh auth login` opcional para no depender de la credencial de Windows de
   `ermendaa` (o invitar a `ermendaa` — ya hecho).