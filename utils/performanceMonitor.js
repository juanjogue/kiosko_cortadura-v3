// utils/performanceMonitor.js
import { Platform } from 'react-native';

/**
 * Monitor de rendimiento para Android TV
 * Ayuda a identificar cuellos de botella y problemas de fluidez
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renders: 0,
            lastRenderTime: Date.now(),
            renderTimes: [],
            warnings: []
        };
        this.isAndroidTV = Platform.OS === 'android' && Platform.isTV;
    }

    /**
     * Registra un render de componente
     * @param {string} componentName - Nombre del componente
     */
    trackRender(componentName) {
        if (!__DEV__) return; // Solo en desarrollo

        const now = Date.now();
        const timeSinceLastRender = now - this.metrics.lastRenderTime;

        this.metrics.renders++;
        this.metrics.lastRenderTime = now;
        this.metrics.renderTimes.push(timeSinceLastRender);

        // Mantener solo los últimos 100 renders
        if (this.metrics.renderTimes.length > 100) {
            this.metrics.renderTimes.shift();
        }

        // Advertir si hay renders muy frecuentes (< 16ms = más de 60 FPS)
        if (timeSinceLastRender < 16) {
            this.addWarning(`⚠️ ${componentName}: Render muy frecuente (${timeSinceLastRender}ms)`);
        }

        // Advertir si hay renders muy lentos (> 100ms)
        if (timeSinceLastRender > 100) {
            this.addWarning(`🐌 ${componentName}: Render lento (${timeSinceLastRender}ms)`);
        }
    }

    /**
     * Agrega una advertencia
     * @param {string} message - Mensaje de advertencia
     */
    addWarning(message) {
        this.metrics.warnings.push({
            message,
            timestamp: Date.now()
        });

        // Mantener solo las últimas 50 advertencias
        if (this.metrics.warnings.length > 50) {
            this.metrics.warnings.shift();
        }

        if (this.isAndroidTV) {
            console.warn(message);
        }
    }

    /**
     * Obtiene estadísticas de rendimiento
     * @returns {object} Estadísticas
     */
    getStats() {
        const avgRenderTime = this.metrics.renderTimes.length > 0
            ? this.metrics.renderTimes.reduce((a, b) => a + b, 0) / this.metrics.renderTimes.length
            : 0;

        const maxRenderTime = this.metrics.renderTimes.length > 0
            ? Math.max(...this.metrics.renderTimes)
            : 0;

        const minRenderTime = this.metrics.renderTimes.length > 0
            ? Math.min(...this.metrics.renderTimes)
            : 0;

        return {
            totalRenders: this.metrics.renders,
            avgRenderTime: avgRenderTime.toFixed(2),
            maxRenderTime,
            minRenderTime,
            estimatedFPS: avgRenderTime > 0 ? Math.round(1000 / avgRenderTime) : 0,
            warnings: this.metrics.warnings.slice(-10), // Últimas 10 advertencias
            isAndroidTV: this.isAndroidTV
        };
    }

    /**
     * Imprime un reporte de rendimiento en consola
     */
    printReport() {
        if (!__DEV__) return;

        const stats = this.getStats();

        console.log('\n📊 === REPORTE DE RENDIMIENTO ===');
        console.log(`🖥️  Plataforma: ${this.isAndroidTV ? 'Android TV' : Platform.OS}`);
        console.log(`🔄 Total Renders: ${stats.totalRenders}`);
        console.log(`⏱️  Tiempo Promedio: ${stats.avgRenderTime}ms`);
        console.log(`📈 FPS Estimado: ${stats.estimatedFPS}`);
        console.log(`⚡ Render Más Rápido: ${stats.minRenderTime}ms`);
        console.log(`🐌 Render Más Lento: ${stats.maxRenderTime}ms`);

        if (stats.warnings.length > 0) {
            console.log('\n⚠️  Advertencias Recientes:');
            stats.warnings.forEach(w => {
                console.log(`  - ${w.message}`);
            });
        }

        console.log('=================================\n');
    }

    /**
     * Reinicia las métricas
     */
    reset() {
        this.metrics = {
            renders: 0,
            lastRenderTime: Date.now(),
            renderTimes: [],
            warnings: []
        };
    }
}

// Instancia singleton
const performanceMonitor = new PerformanceMonitor();

// Imprimir reporte cada 30 segundos en desarrollo
if (__DEV__) {
    setInterval(() => {
        performanceMonitor.printReport();
    }, 30000);
}

export default performanceMonitor;

/**
 * Hook para trackear renders de componentes
 * Uso: useRenderTracker('MiComponente');
 */
export const useRenderTracker = (componentName) => {
    if (!__DEV__) return;

    React.useEffect(() => {
        performanceMonitor.trackRender(componentName);
    });
};
