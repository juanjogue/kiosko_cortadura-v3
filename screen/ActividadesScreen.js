// screens/ActividadesScreen.js
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import { AUTO_SCROLL_SETTINGS } from '../constants/appConstants';
import { useAppContext } from '../context/AppContext';
import { useAutoScroll } from '../hooks/useAutoScroll';

const ActividadCard = ({ item }) => {
    const { theme, isDark } = useAppContext();
    const profesores = item.profesores ? item.profesores.split(';').map(p => p.trim()).filter(p => p) : [];

    // ✅ NUEVO: Detectar si la actividad es HOY
    const esHoy = useMemo(() => {
        if (!item.fecha) return false;
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        return item.fecha === `${dia}/${mes}/${anio}`;
    }, [item.fecha]);

    // ✅ NUEVO: Animación de parpadeo para el borde si es hoy
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (esHoy) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animValue, { toValue: 1, duration: 1000, useNativeDriver: false }),
                    Animated.timing(animValue, { toValue: 0, duration: 1000, useNativeDriver: false })
                ])
            ).start();
        }
    }, [esHoy]);

    const borderColor = esHoy ? animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['#d97706', '#fbbf24'] // Oscila entre Naranja oscuro y Ámbar brillante
    }) : '#334155';

    const AnimatedGlassCard = Animated.createAnimatedComponent(GlassCard);

    return (
        <AnimatedGlassCard
            style={[styles.card, { borderColor, borderWidth: esHoy ? 3 : 1 }]}
            intensity={esHoy ? 30 : 20}
            onPress={() => { }} // Make focusable
        >
            <Text style={[styles.actividadTitle, { color: theme.text }]}>🎯 {item.actividad}</Text>

            <View style={styles.gridContainer}>
                <View style={[styles.gridItem, { minWidth: '45%' }]}>
                    <Text style={styles.gridLabel}>📅 Cuándo</Text>
                    <Text style={styles.gridValue}>
                        {esHoy && <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>¡HOY! </Text>}
                        {item.fecha}
                        {item.horaInicio ? `  🕐Hora: ${item.horaInicio} - ${item.horaFin}` : ''}
                    </Text>
                </View>

                {item.lugar && (
                    <View style={[styles.gridItem, { minWidth: '45%' }]}>
                        <Text style={styles.gridLabel}>📍 Dónde</Text>
                        <Text style={styles.gridValue}>{item.lugar}</Text>
                    </View>
                )}

                {item.departamento && (
                    <View style={[styles.gridItem, { minWidth: '45%' }]}>
                        <Text style={styles.gridLabel}>📚 Departamento que Organiza</Text>
                        <Text style={styles.gridValue}>{item.departamento}</Text>
                    </View>
                )}

                {item.alumnado && (
                    <View style={[styles.gridItem, { minWidth: '45%' }]}>
                        <Text style={styles.gridLabel}>👥 Grupos implicados</Text>
                        <Text style={styles.gridValue}>{item.alumnado}</Text>
                    </View>
                )}
            </View>

            {profesores.length > 0 && (
                <View style={styles.compactSection}>
                    <Text style={styles.inlineLabel}>👨‍🏫 Docentes implicados:</Text>
                    <View style={styles.tagContainer}>
                        {profesores.map((p, i) => <Text key={i} style={styles.profesorTag}>{p}</Text>)}
                    </View>
                </View>
            )}

            {item.observaciones && (
                <View style={styles.observacionesSection}>
                    <Text style={styles.observacionesText}>📝 Observaciones: {item.observaciones}</Text>
                </View>
            )}
        </AnimatedGlassCard>
    );
};

const ActividadesScreen = () => {
    const { datosActividades, config } = useAppContext();
    const { urlActividades } = config;

    const actividadesFuturas = useMemo(() => {
        if (!datosActividades) return [];

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const limite15Dias = new Date(hoy);
        limite15Dias.setDate(hoy.getDate() + 15);

        const parsearFecha = (fechaStr) => {
            if (!fechaStr) return null;
            const str = String(fechaStr).trim();

            if (!isNaN(str) && !str.includes('/')) {
                return new Date((Number(str) - 25569) * 86400000);
            }

            const partes = str.split('/');
            if (partes.length !== 3) return null;
            return new Date(partes[2], partes[1] - 1, partes[0]);
        };

        const actividadesFiltradas = datosActividades.filter(a => {
            const fechaActividad = parsearFecha(a.fecha);
            if (!fechaActividad) return false;
            return fechaActividad >= hoy && fechaActividad <= limite15Dias;
        });

        actividadesFiltradas.sort((a, b) => {
            const fechaA = parsearFecha(a.fecha);
            const fechaB = parsearFecha(b.fecha);
            return fechaA - fechaB;
        });

        return actividadesFiltradas;
    }, [datosActividades]);

    // Usar el hook de Auto-Scroll con velocidad reducida
    const { flatListRef, onContentSizeChange, onLayout } = useAutoScroll(actividadesFuturas, AUTO_SCROLL_SETTINGS.ACTIVITIES_SPEED, 4000);

    const { theme } = useAppContext();

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: theme.text }]}>📅 Actividades Extraescolares</Text>
            </View>
            <View style={styles.listContainer}>
                <FlatList
                    ref={flatListRef}
                    data={actividadesFuturas}
                    renderItem={({ item }) => <ActividadCard item={item} />}
                    keyExtractor={(item, index) => `${item.actividad}-${index}`}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🗓️</Text>
                            <Text style={styles.emptyText}>No hay actividades programadas</Text>
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
    title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
    card: {
        marginBottom: 16,
        padding: 0, // GlassCard handles internal padding via content container mostly, but we can do it here too just fine
        // Removing background/border fixed props
    },
    actividadTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },

    // Estilos Grid
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    gridItem: {
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        padding: 10,
        borderRadius: 8,
        flexGrow: 1,
    },
    gridLabel: { color: '#94a3b8', fontSize: 18, marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' },
    gridValue: { color: '#64748b', fontSize: 18, fontWeight: '600' },

    // Estilos Secciones Compactas
    compactSection: { marginTop: 4, marginBottom: 8 },
    inlineLabel: { color: '#94a3b8', fontSize: 20, marginBottom: 6, fontWeight: 'bold' },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    profesorTag: {
        backgroundColor: '#34d399',
        color: '#064e3b',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        fontWeight: 'bold',
        fontSize: 16
    },
    observacionesSection: { backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 8, marginTop: 4 },
    observacionesText: { color: '#f59e0b', fontSize: 18, fontStyle: 'italic' },
    listContainer: {
        flex: 1,
        position: 'relative',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        padding: 40,
        borderRadius: 24,
    },
    emptyIcon: { fontSize: 80 },
    emptyText: { fontSize: 36, color: '#94a3b8', fontWeight: 'bold', marginTop: 24 },
});

export default ActividadesScreen;