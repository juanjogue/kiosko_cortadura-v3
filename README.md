# Kiosco TV — I.E.S. Fuerte de Cortadura

Kiosco digital informativo para televisores del centro. Muestra en pantalla el **cuadrante de guardias**, las **ausencias del profesorado**, un **resumen del día**, **galería de imágenes**, **alertas** en tira tipo marquee, **noticias RSS** y el **tiempo**, con reloj y "próximo timbre".

Dos formas de ejecutarlo:

- **App Expo/React Native** para Android TV y móvil.
- **Web ligera `dist V3`** en HTML/CSS/JS plano (ES5), pensada para **Smart TV con Linux y WebKit antiguo** (p. ej. marca Engel): se sube a un hosting estático y se abre desde el navegador de la TV.

---

## Características

- Cuadrante de guardias por día y tramo, con tramo actual ("AHORA") y ausencias asociadas.
- Ausencias del profesorado agrupadas por tramo/grupo/aula/tarea.
- Resumen del día (ausentes vs. docentes de guardia).
- Galería de imágenes (desde CSV con URLs, incl. Google Drive).
- Tira de alertas desplazante con prioridad (Info / Warning / Urgent).
- Próximo timbre, reloj en vivo e indicador de estado de sincronización.
- Modo "Espera de guardia" automático al cambiar de tramo (override con cuenta atrás).
- Configuración protegida con **PIN** desde la propia pantalla (⚙️).
- Parámetros configurables **por URL** (sin tocar la pantalla).
- Datos desde **Google Sheets (CSV)** con caché local y anti-caché de exportación.
- Compatible con WebKit antiguo: ES5, sin dependencias, sin flexbox/grid/backdrop-filter.

---

## Estructura del repositorio

```
├─ app/                    # Rutas Expo (React Navigation)
├─ components/             # Componentes compartidos (fondo, reloj, alertas…)
├─ context/AppContext.js   # Estado global de la app (datos, horario, config)
├─ Navigation/AppNavigator.js
├─ screen/                 # GuardiaScreen, AusenciasScreen, Resumen, Galería, RSS, Tiempo…
├─ services/dataService.js # Carga de datos (Google Sheets, RSS, Open-Meteo)
├─ hooks/  utils/  constants/
├─ dist/                   # Exportaciones web anteriores (legado)
├─ dist V1/  dist V1.1/  dist V2/   # Versiones web anteriores (bundle Expo)
├─ dist V3/                # ⭐ Kiosco ligero para Smart TV Linux (WebKit)
│   ├─ index.html          # Estructura de la página
│   ├─ app.js              # Lógica del kiosco (ES5)
│   ├─ styles.css          # Estilos compatibles con WebKit viejo
│   ├─ assets/logo.png     # Logo del centro
│   └─ GUIA_TV_ENGEL.md    # Guía de despliegue y configuración
├─ GUIA_PRUEBAS_TV.md      # Pruebas/optimizaciones para Android TV
├─ OPTIMIZACIONES_TV.md    # Optimizaciones de rendimiento
└─ KioscoApp_Manual de uso.docx
```

> `dist V3` **no se genera con `expo export`**: es un desarrollo manual, deliberadamente
> escrito en ES5 y con CSS compatible con WebKit antiguo, para que funcione en los
> navegadores limitados de las Smart TV Linux.

---

## 📺 desplegar `dist V3` (kiosco en Smart TV Linux, ej. Engel)

1. **Publica la carpeta `dist V3`** en un hosting estático gratuito:
   - [Netlify Drop](https://app.netlify.com/drop): arrastra la carpeta, obtienes URL al instante.
   - GitHub Pages: súbela al repo y activa Pages (rama + `/`).
2. **En la TV** abre el navegador, escribe la URL y añádela a favoritos.
3. Si quieres personalizar sin tocar la pantalla, añade parámetros a la URL:

   ```
   https://tu-url/index.html?rotacion=30&pin=4321&rss=1&tiempo=1&galeria=1
   ```

   | Parámetro       | Qué hace                              | Valores           |
   |-----------------|---------------------------------------|-------------------|
   | `rotacion`      | Segundos por pantalla                 | nº                |
   | `actualizacion` | Segundos entre recarga de datos       | nº                |
   | `galeriaintervalo` | Segundos entre imágenes            | nº                |
   | `duroverride`   | Duración del modo guardia (segundos)  | nº                |
   | `pin`           | PIN de administrador                  | 4-8 dígitos       |
   | `centro`        | Nombre del centro                     | texto             |
   | `guardias`/`ausencias`/`resumen` | Mostrar/u ocultar pantalla | `1`/`0`      |
   | `galeria`/`rss`/`tiempo` | Activar pantalla              | `1`/`0`           |
   | `override`/`dark` | Opciones de comportamiento          | `1`/`0`           |
   | `urlguardias`/`urlausencias`/`urlalertas`/`urlgaleria` | Hojas de datos | URL Google Sheets |
   | `urlrss`, `titulorss` | Feed RSS y título                 | URL / texto       |
   | `lat`, `lon`, `ciudad` | Ubicación del tiempo               | coords / texto    |

4. **Primera configuración desde la TV:** ⚙️ → PIN (por defecto `1234`) → Guardar.
5. **En la TV:** activa "Just Scan/1:1" para evitar overscan y desactiva auto-apagado.

> Guía completa, solución de problemas y tablas de encabezados en
> [`dist V3/GUIA_TV_ENGEL.md`](dist V3/GUIA_TV_ENGEL.md).

---

## 🧾 Datos (Google Sheets CSV)

Las hojas deben publicarse como CSV (**Archivo → Compartir → Publicar en la web → CSV**) y
las columnas esperadas son:

| Hoja        | Columnas                                                    |
|-------------|-------------------------------------------------------------|
| Guardias    | `dia`, `1`, `2`, `3`, `RECREO`, `4`, `5`, `6`               |
| Ausencias   | `PROFESOR/A`, `FECHA`, `HORA`, `GRUPO`, `AULA`, `TAREA`      |
| Alertas     | `FECHA`, `HORA_INICIO`, `HORA_FIN`, `MENSAJE`, `TIPO_ALERTA`, `ACTIVO` |
| Galería     | una columna con URLs `http(s)://…` y opcional `Titulo`        |

Las alertas solo se muestran si `ACTIVO` es `SI`/`TRUE`/`YES`/`1` y la fecha de hoy cae en su rango.

---

## 🚀 Desarrollo (app Expo/React Native)

### Requisitos

- Node.js ≥ 18
- Expo SDK 54

### Comandos

```bash
npm install        # instalar dependencias
npm start          # iniciar Expo
npm run android    # emulador/Android TV (conexión)
npm run web        # versión web en desarrollo
npm run lint       # eslint
```

Secciones útiles de rendimiento en TV: `GUIA_PRUEBAS_TV.md` y `OPTIMIZACIONES_TV.md`.

---

## 📄 Licencia

Proyecto de uso interno del centro educativo. Distribución sujeta a autorización.