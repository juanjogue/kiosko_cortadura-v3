// components/GlobalAlert.js
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Detectar si es Android TV
const isAndroidTV = Platform.OS === 'android' && Platform.isTV;

const GlobalAlert = React.memo(({ alert }) => {
    // Iniciamos en 0 para que sea visible desde el primer frame mientras se mide
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [textWidth, setTextWidth] = useState(0);

    useEffect(() => {
        if (!alert || textWidth === 0) return;

        let isRunning = true;

        const runAnimation = (startPos) => {
            if (!isRunning) return;

            slideAnim.setValue(startPos);

            const endPos = -textWidth;
            const distance = Math.abs(startPos - endPos);

            // ✅ OPTIMIZACIÓN TV: Velocidad más lenta para reducir carga de renderizado
            const duration = isAndroidTV ? distance * 15 : distance * 10;

            Animated.timing(slideAnim, {
                toValue: endPos,
                duration: duration,
                easing: Easing.linear,
                useNativeDriver: true, // ✅ SIEMPRE usar native driver para mejor rendimiento
            }).start(({ finished }) => {
                if (finished && isRunning) {
                    // Reiniciar desde el borde derecho
                    runAnimation(SCREEN_WIDTH);
                }
            });
        };

        // Si el texto es más ancho que la zona segura, empezamos a moverlo
        if (textWidth > 0) {
            runAnimation(0);
        }

        return () => {
            isRunning = false;
            slideAnim.stopAnimation();
        };
    }, [alert, alert?.mensaje, textWidth, slideAnim]);

    const getAlertStyles = (type) => {
        const tipoNormalizado = type?.trim().toLowerCase();
        switch (tipoNormalizado) {
            case 'info':
                return { backgroundColor: '#2563eb', icon: 'ℹ️' };
            case 'warning':
                return { backgroundColor: '#f59e0b', icon: '⚠️' };
            case 'urgent':
                return { backgroundColor: '#dc2626', icon: '🚨' };
            default:
                return { backgroundColor: '#4b5563', icon: '📢' };
        }
    };

    if (!alert) return null;

    const { backgroundColor, icon } = getAlertStyles(alert?.tipo);

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{icon}</Text>
            </View>
            <View style={styles.marqueeContainer}>
                <Animated.Text
                    key={alert.mensaje}
                    style={[styles.message, { transform: [{ translateX: slideAnim }] }]}
                    onLayout={(e) => {
                        const width = e.nativeEvent.layout.width;
                        if (width > 0) setTextWidth(width);
                    }}
                    numberOfLines={1}
                >
                    {alert.mensaje}{"        •        "}{alert.mensaje}{"        •        "}
                </Animated.Text>
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    // ✅ OPTIMIZACIÓN: Solo re-renderizar si el mensaje cambia
    return prevProps.alert?.mensaje === nextProps.alert?.mensaje;
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        zIndex: 2000,
        elevation: 20,
        overflow: 'hidden',
    },
    iconContainer: {
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100, // Icono siempre por encima
    },
    marqueeContainer: {
        flex: 1,
        overflow: 'hidden',
        height: '100%',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 32,
    },
    message: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        paddingLeft: 20,
        // No forzamos minWidth para que textWidth sea real
    },
});

GlobalAlert.displayName = 'GlobalAlert';
export default GlobalAlert;
