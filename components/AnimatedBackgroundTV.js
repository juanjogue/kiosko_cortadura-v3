// components/AnimatedBackgroundTV.js
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

/**
 * Versión OPTIMIZADA del fondo animado para TV Android
 * Elimina las animaciones SVG pesadas y usa gradientes estáticos
 * para mejorar el rendimiento en dispositivos de baja potencia
 */
const AnimatedBackgroundTV = () => {
    const { isDark, theme } = useAppContext();

    // Gradiente estático optimizado para TV
    const colors = isDark
        ? ['#0f172a', '#1e293b', '#334155']
        : ['#e0f2fe', '#f0f9ff', '#dbeafe'];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={colors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            {/* Overlay sutil para textura */}
            <LinearGradient
                colors={['rgba(255,255,255,0.02)', 'transparent', 'rgba(0,0,0,0.02)']}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        zIndex: -1,
    },
});

export default AnimatedBackgroundTV;
