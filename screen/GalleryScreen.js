import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAppContext } from '../context/AppContext';

/**
 * Gallery / Digital Signage Screen
 * Rotates through images fetched from Google Sheets.
 */
const GalleryScreen = () => {
    const { datosGaleria, config, theme, cargarTodosLosDatos } = useAppContext();
    const [index, setIndex] = useState(0);
    const [hasError, setHasError] = useState(false);

    // Timer para detectar si no carga nada
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (datosGaleria.length === 0) setHasError(true);
        }, 10000);
        return () => clearTimeout(timeout);
    }, [datosGaleria]);

    // Timer para la rotación automática
    useEffect(() => {
        if (datosGaleria.length <= 1) return;
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % datosGaleria.length);
        }, config.galeriaIntervalo || 7000);
        return () => clearInterval(interval);
    }, [datosGaleria.length, config.galeriaIntervalo]);

    // Pantalla de carga si no hay datos
    if (!datosGaleria || datosGaleria.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={[styles.text, { color: theme.textSecondary, marginTop: 20 }]}>Buscando imágenes en el Excel...</Text>
                {hasError && (
                    <View style={{ marginTop: 30, alignItems: 'center' }}>
                        <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold' }}>⚠️ No se detectaron imágenes válidas</Text>
                        <TouchableOpacity
                            onPress={() => cargarTodosLosDatos(config)}
                            style={{ marginTop: 20, backgroundColor: '#3b82f6', padding: 15, borderRadius: 10 }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Reintentar Carga</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    const currentImage = datosGaleria[index];

    return (
        <View style={styles.container}>
            <Animated.View
                key={currentImage?.url}
                entering={FadeIn.duration(1000)}
                exiting={FadeOut.duration(1000)}
                style={StyleSheet.absoluteFill}
            >
                {/* Usamos el componente básico de React Native para evitar bloqueos CORS */}
                <Image
                    key={currentImage?.url}
                    source={{ uri: currentImage?.url }}
                    style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
                    resizeMode="contain"
                    onLoad={() => console.log("📸 Galería: Mostrando " + (currentImage.titulo || 'imagen'))}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    text: { fontSize: 24, fontWeight: 'bold' },
    titleBadge: {
        position: 'absolute',
        bottom: 60,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        elevation: 10,
    },
    titleText: {
        color: 'white',
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    }
});

export default GalleryScreen;
