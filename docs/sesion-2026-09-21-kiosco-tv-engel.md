# Sesión: Kiosco TV Engel (dist V3) — 21/09/2026

> Notas para retomar el trabajo. Resumen de decisiones, cambios y pendientes de la
> conversación sobre cómo adaptar la carpeta `dist V3` como kiosco para una
> **Smart TV Engel (Linux, WebKit antiguo)**.

---

## Contexto

- Proyecto: **KioscoApp** (kiosco informativo I.E.S. Fuerte de Cortadura: guardias,
  ausencias, resumen, galería, alertas, RSS, tiempo).
- App principal: Expo/React Native para Android TV.
- `dist V3/` es una **web ligera manual en HTML/CSS/JS plano (ES5)** hecha
  específicamente para el WebKit viejo de las Smart TV Linux (ej. Engel).
- Primer commit del repo: `3e68641 "Versión ligera dist V3 para Smart TV con Linux"`.

## Decisiones acordadas

| Tema                     | Elección                                                                 |
|--------------------------|--------------------------------------------------------------------------|
| Hardware destino         | Navegador web propio de la TV Engel (WebKit), sin mini-PC                |
| Cómo se carga            | **URL pública** (Netlify Drop o GitHub Pages)                            |
| URLs de datos            | Mantener las que ya trae `dist V3` (Google Sheets del centro)            |
| Acceso a configuración   | ⚙️ visible en pantalla + PIN (por defecto `1234`)                        |

## Cambios aplicados

### `dist V3/app.js`
1. **Config por URL** (`applyURLConfig`): parámetros `rotacion`, `actualizacion`,
   `galeriaintervalo`, `duroverride`, `pin`, `centro`, flags `guardias/ausencias/
   resumen/galeria/rss/tiempo/override/dark`, y URLs `urlguardias/urlausencias/
   urlalertas/urlgaleria/urlrss`, `lat/lon/ciudad`. Se aplican en cada carga.
2. `nombreCentro` configurable (default "IES Fuerte de Cortadura") en títulos y `document.title`.
3. Fullscreen de kiosco (`webkitRequestFullscreen` + reintento en 1ª interacción).
4. **Fix bug Resumen**: el doble `for...in` contaba 0 docentes de guardia; ahora itera
   correctamente tramos (`renderResumen`). Con datos reales: 19 (tramo 1 → 3).
5. **Fix bug override**: typo `cardiaOverrideDuration` → `guardiaOverrideDuration`
   (la duración configurada ahora sí se guarda/usaba).
6. **Anti-caché Google**: `convertSheetUrl` añade `&_cb=<timestamp>` para saltar el
   cacheo `max-age=300` de la exportación CSV (los cambios tardaban hasta 5 min).
7. **fitScreen**: `zoom` (WebKit) con borde de seguridad 5% si la altura visible < 1080p
   (evita corte inferior/overscan en TV grandes o HD 768p).

### `dist V3/index.html`
- favicon: `favicon.ico` (inexistente, daba 404) → `assets/logo.png`.
- Título estático → "Kiosco TV" (se sobrescribe en runtime con el nombre del centro).

### Documentación creada
- `dist V3/GUIA_TV_ENGEL.md` — publicación, apertura en TV, PIN, tabla de parámetros
  por URL, ajustes TV (Just Scan, auto-apagado) y solución de problemas.
- `README.md` (raíz) — sustituye el template de Expo.

## Diagnósticos realizados (verificados en vivo)

- Las 4 hojas (Guardias/Ausencias/Alertas/Galería) responden **HTTP 200 con CORS `*`**
  y **UTF-8 válido** (el "�" era artefacto de consola PowerShell, no de los datos).
- **Ausencias**: la hoja configurada (`gid=2111711524`) devuelve SOLO cabecera (sin filas)
  → la web muestra "Sin ausencias" por datos reales vacíos, no por bug.
- **Alertas**: los cambios tardaban por caché de Google (confirmado `max-age=300`);
  con `&cb=` llegan al momento. Las alertas con `ACTIVO=NO` o fecha fuera de hoy no se ven.
- **Proxies CORS**: `api.allorigins.win` dio timeout (408) y `corsproxy.io` dio 403;
  en el navegador normal no hacen falta porque Google devuelve `ACAO: *`.

## Demo (creada y ELIMINADA)

- Carpeta `demo/` con CSVs de prueba y 3 imágenes localhost + servidor en :8090.
  Se activaba vía URL `?urlguardias=…&tiempo=1&rss=0`.
- **Ya desactivada**: servidor 8090 parado y carpeta `demo/` borrada.

## Estado de los servidores locales

- **:8080** sigue activo sirviendo `dist V3` (datos reales). Parar con:
  `Get-Process python | Stop-Process`.
- Demo :8090: detenido.

## Pendientes / próximos pasos sugeridos

1. **Ausencias**: confirmar si hay datos en OTRA pestaña de la hoja; si es así, actualizar
   `urlAusencias` con el `gid=` correcto (o via URL `?urlausencias=…`).
2. Publicar `dist V3` a URL pública (Netlify Drop / GitHub Pages) y probar en la TV Engel:
   - Configurar imagen "Just Scan/1:1" (anti-overscan).
   - Desactivar auto-apagado/ECO.
   - Config inicial con PIN `1234`.
3. Probar en la TV si el WebKit soporta XHR directo a Google (si no, valorar reintentos
   de proxy más fiables a futuro).
4. Si el fichero `dist V3/app.js` se vuelve a modificar, volver a pasar `node --check`.