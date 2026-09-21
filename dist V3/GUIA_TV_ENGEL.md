# Guía de Despliegue — Kiosco TV Engel (Linux)

> `dist V3` es el kiosco escolar en HTML/CSS/JS plano, escrito en **ES5** y con CSS
> compatible con el **WebKit antiguo** de las Smart TV Linux (como la marca Engel).
> No necesita React ni instalación; solo se abre en el navegador de la TV.

---

## 1. Publicar `dist V3` en una URL pública

El navegador de la TV solo puede abrir páginas por **HTTP/HTTPS** (no sirve un
pendrive por `file://` porque el navegador bloquea las peticiones de datos CORS).
Por eso primero subimos la carpeta a un hosting gratuito.

### Opción A — Netlify Drop (la más rápida, no requiere cuenta técnica)

1. Entra en <https://app.netlify.com/drop>.
2. Arrastra y suelta **toda la carpeta `dist V3`** ahí dentro.
3. Netlify la publica al instante y te da una URL del tipo:
   `https://nombre-aleatorio.netlify.app`
4. Guarda esa URL: es la que abrirá la TV.

### Opción B — GitHub Pages (recomendada si quieres control de versiones)

1. Sube la carpeta `dist V3` a un repositorio (p. ej. `kiosco-tv`).
2. En el repo: **Settings → Pages** → Source: `Deploy from a branch` →
   rama `main`, carpeta `/` (o `/dist V3` si lo subes como subcarpeta).
3. Guarda y espera 1-2 minutos. La URL será:
   `https://<tu-usuario>.github.io/kiosco-tv/`

> Cualquier cambio futuro: solo vuelve a subir los archivos `index.html`,
> `app.js`, `styles.css`, `assets/logo.png` y la URL se actualiza sola.

---

## 2. Abrir el kiosco en la TV Engel

1. Enciende la TV y entra en la app de **navegador web** (suele venir integrada;
   si no, instala una desde la tienda de la TV).
2. Escribe la URL del paso anterior y pulsa **OK/Enter**.
3. La página entrará sola a **pantalla completa** automáticamente.
4. Añádela a **favoritos** (marcador) con el mando para no volver a escribirla.

> Si el navegador no guarda la contraseña/caché al apagar la TV, en el siguiente
> arranque solo tendrás que abrir el navegador y pulsar el favorito.

---

## 3. Configuración inicial (solo la primera vez)

El kiosco ya viene preconfigurado con las hojas de cálculo del centro
(Guardias, Ausencias, Alertas, Galería), el nombre del centro y el PIN `1234`.

Si el centro ya está bien así, **no hace falta hacer nada**.

Si quieres cambiar algo desde la propia TV:

1. Pulsa el botón **⚙️** en la esquina inferior derecha (se navega con el mando:
   flechas + OK).
2. Introduce el **PIN** (por defecto `1234`).
3. Cambia las URLs, pantallas activas, tiempos de rotación, PIN, etc.
4. Pulsa **Guardar** — el kiosco se reinicia solo con la nueva configuración.

---

## 4. Parámetros de configuración por URL

Puedes preconfigurar cada TV **añadiendo parámetros a la URL**, sin tocar la
pantalla. Son útiles cuando hay varios televisores con configuraciones distintas.

Ejemplo:

```
https://nombre-aleatorio.netlify.app/?rotacion=30&pin=4321&rss=1&galeria=1&tiempo=1
```

| Parámetro (URL)        | Qué hace                                 | Valores                              |
|------------------------|------------------------------------------|--------------------------------------|
| `rotacion`             | Segundos por pantalla                    | nº (p. ej. `30`)                     |
| `actualizacion`        | Segundos entre recarga de datos          | nº (p. ej. `120`)                    |
| `galeriaintervalo`     | Segundos entre imágenes de la galería    | nº (p. ej. `7`)                      |
| `duroverride`          | Duración del modo "Guardia" (segundos)   | nº (p. ej. `200`)                    |
| `pin`                  | PIN de administrador                     | 4-8 dígitos                          |
| `centro`               | Nombre del centro (título en pantalla)   | texto URL-encoded                    |
| `guardias` / `ausencias` / `resumen` | Mostrar/ocultar pantalla  | `1` o `0`                            |
| `galeria`              | Activa la galería de imágenes            | `1` o `0`                            |
| `rss`                  | Activa las noticias RSS                  | `1` o `0`                            |
| `tiempo`               | Activa el tiempo meteorológico           | `1` o `0`                            |
| `override`             | Auto-forzar pantalla de guardia al cambiar de tramo | `1` o `0`           |
| `dark`                 | Tema oscuro (por defecto activado)       | `1` o `0`                            |
| `urlguardias`, `urlausencias`, `urlalertas`, `urlgaleria` | URLs de datos Google Sheets | URL completa                  |
| `urlrss`, `titulorss`  | Feed RSS y su título                     | URL / texto                          |
| `lat`, `lon`, `ciudad` | Ubicación del tiempo                     | coordenadas / texto                  |

> Los parámetros por URL se re-aplican en **cada carga** de la página, por lo que
> si una URL los lleva, tienen prioridad sobre lo que se guarde desde la TV.
> Para cambiar un valor de esa TV, quita su parámetro de la URL o edítala.

---

## 5. Ajustes recomendados en la TV Engel

Para que el kiosco se quede fijo y no se apague:

- **Apagar el auto-apagado / suspensión**: en Ajustes → Energía, desactiva
  "Apagado automático" y "AutoPowerDown" (aunque la TV tenga detección de señal,
  algunas Engel piden una pulsación cada X horas, consulta el manual).
- **Modo ECO / ahorro de energía**: desactívalo para que no baje el brillo.
- **Entrada HDMI**: si usas un dispositivo externo, fija la entrada HDMI como
  inicio y activa CEC si existe.
- **Arrancar en el navegador**: si la TV lo permite (aplicación por defecto en
  inicio), elige el navegador para que abra directamente el favorito del kiosco.
- Si el navegador pide ubicación/permisos al abrir por primera vez, acéptalos
  con el mando (el tiempo usa tu posición).

---

## 6. Solución de problemas

| Problema                          | Causa probable                                          | Solución                                                                 |
|-----------------------------------|---------------------------------------------------------|--------------------------------------------------------------------------|
| Pantalla en negro al abrir        | Transición de pantalla o caché vieja                    | Recarga con el mando (recargar página); si persiste, limpia caché del navegador |
| "Sin datos" en rojo              | No se pudo descargar Google Sheets (CORS/red)           | Revisa conexión TV; el kiosco reintenta automáticamente y usa caché; la app prueba varios proxy CORS |
| No cambian las pantallas          | Solo hay 1 pantalla activa                              | Activa más pantallas en ⚙️ (Guardias, Ausencias, Resumen...)               |
| Las URLs no se guardan            | Cambios hechos con la URL `?admin=…` vs guardados       | Guarda siempre desde ⚙️ → PIN → Guardar                                   |
| El reloj / timbre no coincide     | Franjas horarias distintas a tu centro por URL          | Edita ⚙️ → PIN (o `centro`/horarios por URL no disponibles: cambia en `app.js`) |
| Galería no muestra imágenes       | Las celdas del Excel no tienen URLs válidas            | Revisa que la hoja tenga una columna con enlaces `http(s)://`             |
| Emojis se ven como cuadrados      | El WebKit de la TV no tiene esa tipografía emoji        | Normal en TV antiguas; el texto alfanumérico sigue funcionando            |

### Datos técnicos

- **Formato de datos**: Google Sheets exportado como CSV (URL `/pub?output=csv`).
- **Caché**: los datos se guardan en `localStorage` de la TV, de modo que si no
  hay internet el kiosco muestra la última información cargada.
- **Proxies CORS** integrados: `allorigins.win` y `corsproxy.io` (en ese orden)
  si el navegador de la TV bloquea la descarga directa.

---

## 7. Resumen de archivos

```
dist V3/
├─ index.html      → estructura de la página
├─ app.js          → lógica del kiosco (ES5)
├─ styles.css      → estilos compatibles con WebKit viejo
├─ assets/logo.png → logo del centro
└─ GUIA_TV_ENGEL.md → este documento
```

Publica **todo** el contenido de `dist V3` (manteniendo la estructura de carpetas).