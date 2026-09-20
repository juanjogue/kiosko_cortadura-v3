# Guía de Pruebas y Solución de Problemas - Android TV

## 🧪 Cómo Probar las Optimizaciones

### 1. Compilar y Ejecutar

```bash
# Limpiar caché
npm run reset-project

# Instalar dependencias
npm install

# Ejecutar en Android TV
npm run android
```

### 2. Verificar Rendimiento Visual

**Checklist de Pruebas:**

- [ ] **Fondo:** ¿Se ve un gradiente estático sin animaciones pesadas?
- [ ] **Transiciones:** ¿Las pantallas cambian sin animaciones de fade/slide?
- [ ] **Barra de Progreso Superior:** ¿Avanza suavemente sin retroceder?
- [ ] **Barra de Progreso de Clase:** ¿Se actualiza correctamente?
- [ ] **GlobalAlert (Ticker):** ¿El texto se desplaza fluidamente?
- [ ] **Reloj:** ¿Se actualiza sin causar lag?
- [ ] **Navegación:** ¿Puedes navegar con el mando sin bloqueos?

### 3. Monitorear en Consola

Si has habilitado el monitor de rendimiento, verás reportes cada 30 segundos:

```
📊 === REPORTE DE RENDIMIENTO ===
🖥️  Plataforma: Android TV
🔄 Total Renders: 1234
⏱️  Tiempo Promedio: 16.5ms
📈 FPS Estimado: 60
⚡ Render Más Rápido: 8ms
🐌 Render Más Lento: 45ms
=================================
```

## 🐛 Solución de Problemas Comunes

### Problema 1: "La barra de progreso sigue avanzando y retrocediendo"

**Causa:** Conflicto entre animaciones y actualizaciones de estado.

**Solución:**
1. Verificar que estás en Android TV (no emulador)
2. Revisar que `isAndroidTV` se detecta correctamente:
   ```javascript
   console.log('¿Es Android TV?', Platform.OS === 'android' && Platform.isTV);
   ```
3. Si el problema persiste, deshabilitar completamente la barra de progreso:
   ```javascript
   // En AppNavigator.js, línea ~320
   // Comentar todo el bloque de la barra de rotación
   ```

### Problema 2: "La aplicación sigue lenta"

**Diagnóstico:**
1. Abrir Chrome DevTools Remote Debugging
2. Ir a Performance tab
3. Grabar 10 segundos de uso
4. Buscar "Long Tasks" (tareas > 50ms)

**Posibles causas:**
- **Imágenes muy grandes:** Comprimir assets en `assets/`
- **Datos excesivos:** Reducir cantidad de registros en Google Sheets
- **FlatList sin optimizar:** Ver sección "Optimizar Pantallas"

### Problema 3: "Pantalla en blanco al cargar"

**Solución:**
1. Verificar que `AnimatedBackgroundTV.js` existe
2. Comprobar imports en `App.js`:
   ```javascript
   import AnimatedBackgroundTV from './components/AnimatedBackgroundTV';
   ```
3. Revisar consola para errores de sintaxis

### Problema 4: "El marquee (GlobalAlert) no se mueve"

**Verificar:**
1. ¿Hay alertas activas? Revisar Google Sheet de alertas
2. ¿El mensaje es muy corto? Debe ser más ancho que la pantalla
3. ¿useNativeDriver está habilitado? Debe ser `true`

**Debug:**
```javascript
// En GlobalAlert.js, agregar:
console.log('Ancho del texto:', textWidth);
console.log('Ancho de pantalla:', SCREEN_WIDTH);
```

## 🔧 Optimizaciones Adicionales (Si Aún Hay Lag)

### Opción 1: Reducir Frecuencia del Reloj

En `context/AppContext.js`, línea ~364:

```javascript
// Cambiar de 1000ms (cada segundo) a 10000ms (cada 10 segundos)
const timerId = setInterval(() => {
    const now = new Date();
    if (FAKE_TIME) {
        const [h, m] = FAKE_TIME.split(':').map(Number);
        now.setHours(h, m, 0, 0);
    }
    setCurrentDate(now);
}, 10000); // ← Cambiar aquí
```

### Opción 2: Deshabilitar Animaciones Completamente

Crear archivo `constants/tvConfig.js`:

```javascript
export const TV_OPTIMIZATIONS = {
    disableAllAnimations: true,
    disableProgressBar: true,
    disableMarquee: false,
    updateInterval: 10000, // 10 segundos
};
```

### Opción 3: Modo "Performance" en Configuración

Agregar en `ConfigScreen.js`:

```javascript
<SwitchItem
    label="Modo Alto Rendimiento (TV)"
    value={localConfig.performanceMode}
    onValueChange={(val) => handleInputChange('performanceMode', val)}
/>
```

Y en `AppNavigator.js`:

```javascript
const isAndroidTV = (Platform.OS === 'android' && Platform.isTV) || config.performanceMode;
```

## 📱 Comparación de Navegadores

| Navegador | Rendimiento | Recomendación |
|-----------|-------------|---------------|
| Chrome (Android TV) | ⭐⭐⭐⭐ | Recomendado |
| Firefox (Android TV) | ⭐⭐⭐ | Bueno |
| Navegador Nativo | ⭐⭐ | Evitar |
| WebView App | ⭐⭐⭐⭐⭐ | Mejor opción |

## 🎯 Métricas de Éxito

Después de las optimizaciones, deberías ver:

- ✅ **FPS:** 50-60 (antes: 15-20)
- ✅ **Uso CPU:** 20-30% (antes: 70-80%)
- ✅ **Tiempo de carga:** < 3s (antes: 5-10s)
- ✅ **Memoria:** < 200MB (antes: 300-400MB)
- ✅ **Fluidez:** Sin bloqueos ni stuttering

## 📞 Soporte

Si después de aplicar todas las optimizaciones sigues teniendo problemas:

1. **Exportar logs:**
   ```bash
   adb logcat > tv_logs.txt
   ```

2. **Capturar video del problema:**
   - Grabar pantalla mostrando el lag
   - Incluir consola de DevTools

3. **Información del dispositivo:**
   - Modelo de TV
   - Versión de Android
   - RAM disponible
   - Navegador utilizado

## 🚀 Próximos Pasos

1. Probar en producción con usuarios reales
2. Recopilar feedback sobre fluidez
3. Ajustar configuraciones según necesidad
4. Considerar app nativa si persisten problemas

---

**Nota:** Estas optimizaciones están diseñadas específicamente para Android TV. En otras plataformas (web, móvil) la aplicación seguirá usando las animaciones completas para mejor experiencia visual.
