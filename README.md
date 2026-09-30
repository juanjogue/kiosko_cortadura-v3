# Kiosco TV — IES Fuerte de Cortadura

Kiosco informativo para la pantalla de la sala de profesores, pensado para
**Smart TV con Linux y WebKit antiguo** (Engel y similares). Sin build, sin
frameworks, sin servidor: son cuatro archivos estáticos que se publican tal
cual en GitHub Pages o Netlify Drop.

La rama activa es **`distV3`** y es la que se sirve.

---

## Qué muestra

| Pantalla | Contenido |
|----------|-----------|
| **Guardias** | Docente de guardia del tramo actual y del siguiente, con el timbre en curso |
| **Ausencias** | Docentes ausentes hoy con grupo, aula y tarea de cada hora |
| **Actividades previstas** | Agenda de actividades y eventos desde hoy en adelante (destaca la de hoy) |
| **Resumen** | Recuento de guardias, ausencias y actividades de la semana |
| **Galería** | Rotación de imágenes desde una hoja de cálculo |
| **Noticias RSS** | Titulares con código QR para leerlos en el móvil |
| **Tiempo** | Predicción de 3 días vía Open-Meteo |
| **Repos** (idle) | Fuera del horario lectivo: reloj grande, fecha y horario del centro |

Además, una **tira de alertas** en la parte inferior con los avisos activos de
la hoja de alertas, y dos barras de progreso (rotación de pantallas y tramo).

## Requisitos

- Un navegador con WebKit antiguo (TV Engel/Linux, navegadores antiguos).
- Las TVs se configuran una sola vez: el botón **⚙️** con el PIN `1234`.

## Puesta en marcha

Clona la rama y sírvela por HTTP (no vale abrir el `index.html` con `file://`):

```bash
git clone --single-branch --branch distV3 https://github.com/juanjogue/kiosko_cortadura-v3.git
cd kiosko_cortadura-v3
python -m http.server 8123
```

Abre <http://127.0.0.1:8123/>. Para ver todo funcionando **sin esperar a las
hojas de cálculo reales**, añade `?demo=1` o `?demo=manana`.

### Parámetros de URL (útiles para depurar)

Se re-aplican en **cada** carga y tienen prioridad sobre lo guardado en la TV.
Deben ir en la URL raíz (`http://…/?demo=1`), nunca en `…/index.html?demo=1`.

| Parámetro | Qué hace | Valores |
|-----------|----------|---------|
| `demo` | Datos ficticios: `1` = horario deslizante, `manana` = reloj a las 10:25 | `1`, `manana` |
| `noidle` | Desactiva la pantalla de reposo | `1` |
| `idleinicio` / `idlefin` | Ventana de horario lectivo | `HH:MM` |
| `rotacion` | Segundos por pantalla | nº (por defecto 20) |
| `actualizacion` | Segundos entre recargas de datos | nº (por defecto 60) |
| `galeriaintervalo` | Segundos entre imágenes de la galería | nº (por defecto 7) |
| `duroverride` | Duración del modo Guardia (segundos) | nº (por defecto 200) |
| `override` | Auto-forzar la pantalla de guardia al cambiar de tramo | `1`, `0` |
| `pin` | PIN de administrador | 4-8 dígitos |
| `centro` | Nombre del centro | texto |
| `guardias` / `ausencias` / `actividades` / `resumen` | Mostrar u ocultar pantalla | `1`, `0` |
| `galeria` / `rss` / `tiempo` | Activar esos módulos | `1`, `0` |
| `urlguardias`, `urlausencias`, `urlactividades`, `urlalertas`, `urlgaleria` | URLs de las hojas | URL completa |
| `urlrss`, `titulorss` | Feed de noticias y su título | URL / texto |
| `lat`, `lon`, `ciudad` | Ubicación del tiempo | coordenadas / texto |
| `dark` | Tema oscuro (activado por defecto) | `1`, `0` |

## Fuentes de datos

Todo entra por **Google Sheets publicado como CSV** (`/pub?output=csv`). Para
editar datos, abre la hoja, cambia las celdas y listo: el kiosco la relee cada
minuto.

| Hoja | Columnas que entiende |
|------|----------------------|
| **Guardias** | `DÍA` + una columna por tramo (`1`, `2`, `3`, `RECREO`, `4`, `5`, `6`). Varios docentes en la misma celda separados por `;` |
| **Ausencias** | Formato largo: `PROFESOR`, `FECHA`, `HORA`, `GRUPO`, `AULA`, `TAREA`. También acepta el formato ancho del formulario (`DOCENTE`, `FECHA DE AUSENCIA`, `1ª HORA`…) |
| **Actividades** | `ACTIVIDAD`, `FECHA`, `HORA COMIENZO`, `HORA FIN`, `LUGAR`, `ALUMNADO IMPLICADO`, `PROFESOR1..3`, `DEPARTAMENTO`, `OBSERVACIONES` |
| **Alertas** | `MENSAJE`, `TIPO`, `ACTIVO`, `FECHA INICIO`, `FECHA FIN`, `HORA INICIO`, `HORA FIN` |
| **Galería** | Una celda por imagen con su URL `http(s)://` |

Los nombres se comparan siempre **sin acentos**, así que da igual cómo los
escribas en la hoja.

## Despliegue

1. Sube el contenido de la raíz a GitHub en la rama `distV3`.
2. En **Settings → Pages**, deja que la rama `distV3` / carpeta `/ (root)` sea
   la fuente.
3. Abre la URL de Pages en la TV y crea el favorito.

Alternativa rápida: arrastrar la carpeta a [Netlify Drop](https://app.netlify.com/drop).

Detalle de ajustes de la TV, parámetros y troubleshooting:
**[GUIA_TV_ENGEL.md](GUIA_TV_ENGEL.md)**.

## Estructura

```
.
├─ index.html        → estructura de la página
├─ app.js            → toda la lógica del kiosco (ES5)
├─ styles.css        → estilos compatibles con WebKit viejo
├─ assets/logo.png   → logo del centro
├─ GUIA_TV_ENGEL.md  → guía de despliegue y resolución de problemas
└─ AGENTS.md         → reglas de trabajo para IA/agentes en este repo
```

## Notas técnicas

- **ES5 puro**: nada de `let`/`const`, flechas, template literals, `fetch` ni
  `Promise.allSettled`. Las descargas se hacen con `XMLHttpRequest`.
- **CSS sinGrid ni flex `gap`**, y sin `backdrop-filter`, para que funcione en
  el WebKit de la TV.
- **Sin proxy**: Google Sheets (`pub?output=csv`), Open-Meteo y rss2json envían
  `Access-Control-Allow-Origin: *`, así que se descargan en directo.
- **Caché en `localStorage`** (`kiosco_data_cache`): si la TV se queda sin
  internet, sigue mostrando la última información descargada.
- **Recarga nocturna** a las **03:00**, una vez al día, para no acumular
  memoria en el navegador de la TV.
- **Cache-busters**: tras tocar `app.js` o `styles.css` hay que subir su `?vN`
  en `index.html`, o la TV seguirá con el código viejo.
