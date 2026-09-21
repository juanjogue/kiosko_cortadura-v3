# Sesión 2: Kiosco TV Engel (dist V3) — 21/09/2026 (tarde)

> Continuación de `sesion-2026-09-21-kiosco-tv-engel.md`. Mejoras de layout de
> guardias, pantalla de reposo, modos de prueba y nueva pantalla de Actividades.
> Commit final: `1e587ba`.

---

## Contexto

- Trabajamos sobre `dist V3/` servida en local con `npx serve` en el puerto **:8123**
  (sigue activo al cerrar la sesión; para pararlo: buscar proceso `node` de serve).
- Verificación visual durante toda la sesión: **Edge headless** (`--headless=new
  --screenshot`) contra `http://localhost:8123/...`.

## Cambios aplicados (todos en `dist V3/`)

### Layout de la tabla de Guardias (`app.js` + `styles.css`)
1. **Columnas por `<colgroup>`**: Horario 9%, Ausencias 15%, Grupo 8%, Aula 9%,
   **Tareas 38%**, **Docentes de Guardia 21%**, con `table-layout: fixed` y
   `word-wrap` (petición del usuario: más espacio a las tareas).
2. **Tareas asociadas al profesor ausente**: cada tarea muestra `Nombre Apellido:`
   en negrita; grupo/aula agrupados por profesor con separador (`.g-slot`).
   Nuevo helper `formatNombre()` ("Apellido, Nombre" → "Nombre Apellido"),
   reutilizado en Ausencias y Resumen.
3. **Auto-scroll vertical en Guardias**: contenedor `#guardiaScroll`;
   `fitListScroll()` mide el hueco hasta `#screenRoot` y `startListScroll(id)`
   (ahora acepta id; guarda `maxScroll < 8` para no marear cuando cabe).
   La **cabecera de la tabla es fija** (tabla aparte `.guardiaHead` fuera del
   scroll, mismo colgroup para alinear columnas).
4. **Badge "SIGUIENTE"**: fila del próximo tramo con clase `next` + badge ámbar.
   Fix: al arrancar la TV en mitad de un tramo, `checkTramoChange` ahora también
   dispara el override inicial (antes el badge AHORA tardaba hasta 10 s).

### Pantalla de reposo (idle)
- Fuera de la ventana lectiva muestra reloj grande, fecha, horario del centro y,
  si están activos, tiempo y galería en miniatura. Rotación pausada durante el
  reposo; transición automática al entrar/salir (`prevIdle` en `tickSec`).
- **Ventana configurable**: `idleInicio` (08:00) / `idleFin` (14:50) en
  DEFAULT_CONFIG, modificables por URL `?idleinicio=…&idlefin=…`.
  Decisión: la ventana manda (no los tramos) y los **fines de semana siempre
  reposo**. A las 08:00 sale del reposo aunque la 1ª clase empiece a las 08:15.
- RSS/Tiempo no pueden sacar la pantalla del reposo al re-renderizar
  (`currentScreenType` + checks en `fetchRSS`/`fetchWeather`).

### Recarga nocturna
- `scheduleNightReload()`: `location.reload()` a las **03:00**, una vez al día
  (fecha en `localStorage: kiosco_last_autoreload`), para limpiar memoria del
  WebKit viejo en TVs 24/7.

### Modos de prueba por URL
- `?noidle=1`: fuerza las pantallas normales fuera de horario.
- `?demo=1`: datos ficticios + **horario deslizante** alrededor de la hora real
  (siempre hay tramo AHORA y SIGUIENTE visibles).
- `?demo=manana`: **reloj ficticio 10:25** (`installFakeClock` sustituye
  `window.Date` con offset) + horario real de mañana; tramo 3 = AHORA,
  RECREO = SIGUIENTE. Toda la app (reloj, timbre, alertas) usa la hora falsa.
- `demo` y `noidle` **no se persisten**: `saveConfig()` los pone a false en la
  copia que guarda en localStorage.
- Actividades de ejemplo incluidas en ambos demos.

### Pantalla nueva: Actividades Previstas (📅)
- **Fuente**: hoja propia (`urlActividades` en DEFAULT_CONFIG con la URL del
  centro; editable en ⚙️ → "URL Actividades" o `?urlactividades=…`).
  Cabeceras de la hoja: `ACTIVIDAD, DEPARTAMENTO, FECHA, HORA COMIENZO,
  HORA FIN, PROFESOR1..3, ALUMNADO IMPLICADO, LUGAR, OBSERVACIONES`.
- `procesarActividades()`: ignora filas sin ACTIVIDAD/FECHA, filtra
  `Ninguno` en profesores, trata `0:00` como "sin hora", formatea nombres,
  ordena por fecha. En pantalla se muestran **de hoy en adelante**; HOY va
  destacado en ámbar; título, 📍 lugar, 🕐 horas, 👥 alumnado, 🏫 departamento,
  📝 observaciones. Cacheada en localStorage como el resto.
- Rotación: Guardias → Ausencias → **Actividades** → Resumen. Flags
  `?actividades=0/1` y checkbox "Mostrar Actividades" en ⚙️.
- La hoja de Alertas vuelve a ser solo marquesina (se descartó el enfoque
  intermedio de marcar `TIPO_ALERTA=Actividad` en la hoja de alertas).

### Documentación
- `GUIA_TV_ENGEL.md`: tabla de parámetros ampliada (`noidle`, `demo`,
  `idleinicio/idlefin`, `actividades`, `urlactividades`), sección **4.1**
  (reposo + modos demo) y **4.2** (hoja de actividades con tabla de columnas),
  fila nueva en troubleshooting ("solo se ve un reloj grande") y nota de la
  recarga nocturna.

## Trucos / problemas encontrados

- **`serve` (npx serve) redirige `/index.html?query` → `/index` SIN query**:
  los parámetros por URL deben ir en la raíz (`/?demo=1`). Documentado en la guía.
- Las capturas headless primeros intentos fallaban por caché de perfil: usar
  `--user-data-dir` temporal por captura.

## Commits

- `1e587ba` — dist V3: pantallas guardias/actividades mejoradas, modo reposo,
  demo y recarga nocturna (4 archivos, +577/−39).

## Pendientes / próximos pasos sugeridos

1. Publicar `dist V3` actualizada al hosting (Netlify Drop / GitHub Pages) y
   probar en la TV Engel (recordar: params por URL en la raíz).
2. En la hoja de actividades, añadir filas con fechas futuras (las 2 actuales
   eran del día y caducan solas).
3. Si se retoca `app.js`, `node --check` + captura headless de las pantallas
   afectadas (flujo usado en esta sesión).
4. Idea no solicitada aún: pantalla Resumen no muestra actividades (podrían
   añadirse ahí como lista corta si se pide).
