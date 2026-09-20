import { BlurView } from 'expo-blur';
import React, { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

const GlassCard = forwardRef(({ children, style, intensity, onPress, onFocus, onBlur, focusable = true }, ref) => {
    const { isDark, theme } = useAppContext();
    const [isFocused, setIsFocused] = useState(false);

    // Si no se provee intensidad, usar la del tema
    const finalIntensity = intensity !== undefined ? intensity : theme.glassIntensity;

    const handleFocus = () => {
        setIsFocused(true);
        if (onFocus) onFocus();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (onBlur) onBlur();
    };

    // Estilos dinámicos para el estado de foco
    const focusStyles = isFocused ? {
        borderColor: '#3b82f6',
        borderWidth: 2,
        transform: [{ scale: 1.02 }],
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 10,
    } : {};

    const ContainerComponent = onPress ? Pressable : View;

    return (
        <ContainerComponent
            ref={ref}
            onPress={onPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                },
                style,
                focusStyles
            ]}
            focusable={focusable && !!onPress} // Solo focable si tiene onPress o es explícitamente focable
        >
            {Platform.OS !== 'web' ? (
                <BlurView intensity={finalIntensity} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            ) : (
                <View style={[
                    StyleSheet.absoluteFill,
                    styles.webGlass,
                    { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.4)' }
                ]} />
            )}
            <View style={styles.content}>
                {children}
            </View>
        </ContainerComponent>
    );
});

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 10,
    },
    webGlass: {
        // @ts-ignore - CSS properties for web
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(30, 41, 59, 0.4)', // Más transparente en web para ver el blur
    },
    content: {
        padding: 15,
        zIndex: 1,
    },
});

GlassCard.displayName = 'GlassCard';
export default GlassCard;
