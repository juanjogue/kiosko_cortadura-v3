import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSchoolSchedule } from '../hooks/useSchoolSchedule';

const ProximoTimbre = React.memo(() => {
    const { nextEvent, timeLeftSeconds } = useSchoolSchedule();

    const infoTimbre = useMemo(() => {
        if (!nextEvent) return null;

        const diffMinutes = Math.floor(timeLeftSeconds / 60);
        const diffSecRemaining = Math.floor(timeLeftSeconds % 60);

        let textoHito = '';
        if (nextEvent.type === 'INICIO') {
            textoHito = `Próximo: ${nextEvent.label}`;
        } else {
            // Si termina un tramo, solemos decir que empieza el siguiente o recreo
            textoHito = `Cambio de hora (${nextEvent.label})`;
        }

        // Caso especial recreo
        if (String(nextEvent.label).toUpperCase() === 'RECREO' && nextEvent.type === 'INICIO') {
            textoHito = 'Recreo';
        }

        return {
            minutos: diffMinutes,
            segundos: diffSecRemaining,
            texto: textoHito
        };
    }, [nextEvent, timeLeftSeconds]);

    if (!infoTimbre) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{infoTimbre.texto}</Text>
            <View style={styles.timerRow}>
                <Text style={styles.value}>
                    {infoTimbre.minutos > 0 ? `${infoTimbre.minutos} min` : `${infoTimbre.segundos} seg`}
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        alignItems: 'center',
        marginHorizontal: 10,
        minWidth: 120,
    },
    label: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    value: {
        color: '#fbbf24', // Amarillo ámbar para resaltar que es una cuenta atrás
        fontSize: 20,
        fontWeight: 'bold',
    },
});

ProximoTimbre.displayName = 'ProximoTimbre';
export default ProximoTimbre;
