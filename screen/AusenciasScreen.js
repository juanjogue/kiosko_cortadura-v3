// screens/AusenciasScreen.js
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import { ORDEN_TRAMOS } from '../constants/appConstants';
import { useAppContext } from '../context/AppContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useSchoolSchedule } from '../hooks/useSchoolSchedule';
import { formatToDDMMYYYY } from '../utils/dateUtils';

const AusenciaCard = ({ item, currentTramoIndex }) => {
    const { theme, isDark } = useAppContext();
    const nombre = useMemo(() => {
        if (!item.profesor) return '';
        return item.profesor.includes(',')
            ? item.profesor.split(',').map(p => p.trim()).reverse().join(' ')
            : item.profesor;
    }, [item.profesor]);

    // ✅ FILTRO: Solo mostramos los tramos que aún no han pasado
    const tramos = useMemo(() => {
        return Object.keys(item.horas || {})
            .filter(tramo => ORDEN_TRAMOS.indexOf(tramo) >= currentTramoIndex)
            .sort((a, b) => ORDEN_TRAMOS.indexOf(a) - ORDEN_TRAMOS.indexOf(b));
    }, [item.horas, currentTramoIndex]);

    if (tramos.length === 0) return null;

    return (
        <GlassCard style={styles.card} intensity={30} onPress={() => { }}>
            <View style={styles.cardHeader}>
                <Text style={styles.icon}>❌</Text>
                <Text style={[styles.profesorName, { color: theme.text }]}>{nombre}</Text>
            </View>
            {tramos.map(tramo => {
                const slot = item.horas[tramo];
                const esRecreo = tramo === 'RECREO';
                return (
                    <View key={tramo} style={[styles.tramoContainer, esRecreo ? styles.recreoSlot : styles.tramoSlot]}>
                        <View style={styles.tramoInfo}>
                            {esRecreo ? (
                                <Text style={styles.slotText}>
                                    <Text style={styles.recreoTitle}>☕ RECREO</Text> - Zona: {slot.zona || '—'}
                                </Text>
                            ) : (
                                <>
                                    <View style={styles.grupoAulaContainer}>
                                        <Text style={styles.grupoText}>{slot.grupo || '—'}</Text>
                                        <Text style={styles.aulaText}>{slot.aula || '—'}</Text>
                                    </View>
                                    {slot.tarea && <Text style={styles.tareaText}>📝 Tarea: {slot.tarea}</Text>}
                                </>
                            )}
                        </View>
                        <View style={[styles.tramoLabelContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
                            {!esRecreo && <Text style={styles.tramoTitle}>TRAMO</Text>}
                            <Text style={styles.tramoLabelText}>
                                {esRecreo ? '☕' : tramo}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </GlassCard>
    );
};

const AusenciasScreen = () => {
    const { datosAusencias, config, currentDate } = useAppContext();
    const { urlAusencias } = config;

    // Determinar el tramo actual mediante el hook centralizado
    const { currentTramoIndex } = useSchoolSchedule();

    const ausenciasHoy = useMemo(() => {
        const hoyStr = formatToDDMMYYYY(currentDate);

        return datosAusencias.filter(a => {
            const fechaNormalizada = formatToDDMMYYYY(a.fecha);
            if (fechaNormalizada !== hoyStr) return false;

            const tramosProfesor = Object.keys(a.horas || {});
            const tieneTramosPendientes = tramosProfesor.some(t => ORDEN_TRAMOS.indexOf(t) >= currentTramoIndex);
            return tieneTramosPendientes;
        });
    }, [datosAusencias, currentTramoIndex, currentDate]);

    // Usar el hook de Auto-Scroll
    const { flatListRef, onContentSizeChange, onLayout } = useAutoScroll(ausenciasHoy);

    const { theme, isDark } = useAppContext();

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: theme.text }]}>📋 Ausencias del Profesorado</Text>
            </View>

            <View style={styles.listContainer}>
                <FlatList
                    ref={flatListRef}
                    data={ausenciasHoy}
                    renderItem={({ item }) => <AusenciaCard item={item} currentTramoIndex={currentTramoIndex} />}
                    keyExtractor={(item, index) => `${item.profesor}-${index}`}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🎉</Text>
                            <Text style={styles.emptyText}>¡Sin ausencias pendientes!</Text>
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 80, paddingTop: 20 }}
                    onContentSizeChange={onContentSizeChange}
                    onLayout={onLayout}
                />

            </View>


        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 32, color: 'white', fontWeight: 'bold', textAlign: 'center', flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, justifyContent: 'center' },
    card: { marginBottom: 20 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    icon: { fontSize: 36, marginRight: 16 },
    profesorName: { fontSize: 32, fontWeight: 'bold' },
    tramoContainer: { flexDirection: 'row', borderRadius: 10, marginTop: 10, overflow: 'hidden' },
    tramoSlot: { backgroundColor: 'rgba(51, 65, 85, 0.4)' },
    recreoSlot: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    tramoInfo: { flex: 1, padding: 16 },
    recreoTitle: { color: '#f59e0b', fontWeight: 'bold', fontSize: 24 },
    grupoAulaContainer: { flexDirection: 'row', gap: 14, marginBottom: 10, alignItems: 'center' },
    grupoText: { backgroundColor: '#7c3aed', color: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, fontSize: 24, fontWeight: 'bold' },
    aulaText: { backgroundColor: '#0891b2', color: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, fontSize: 24, fontWeight: 'bold' },
    slotText: { color: '#64748b', fontSize: 22 },
    tareaText: { color: '#f59e0b', fontSize: 22, fontStyle: 'italic' },
    tramoLabelContainer: { width: 100, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
    tramoTitle: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: -2 },
    tramoLabelText: { color: '#f59e0b', fontSize: 48, fontWeight: 'bold' },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: 40,
        borderRadius: 24,
    },
    emptyIcon: { fontSize: 80 },
    emptyText: { fontSize: 36, color: '#34d399', fontWeight: 'bold', marginTop: 24 },
    listContainer: {
        flex: 1,
        position: 'relative',
    },

});

export default AusenciasScreen;