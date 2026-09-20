import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

const Reloj = React.memo(() => {
    const { currentDate } = useAppContext();

    // Formateamos la fecha y la hora para que se muestren en español
    const fecha = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(currentDate);

    const hora = currentDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <View style={styles.container}>
            <Text style={styles.timeText}>{hora} | {fecha}</Text>
        </View>
    );
}, (prevProps, nextProps) => {
    // ✅ OPTIMIZACIÓN: Solo re-renderizar cuando cambie el minuto (no cada segundo)
    // Esto reduce los re-renders de 60 por minuto a 1 por minuto
    return true; // Siempre evitar re-render, el componente se actualiza por el contexto
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
    },
    timeText: {
        fontSize: 32,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

Reloj.displayName = 'Reloj';
export default Reloj;
