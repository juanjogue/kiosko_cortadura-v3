// screens/GuardiaScreen.js
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import { DIAS_SEMANA } from '../constants/appConstants';
import { useAppContext } from '../context/AppContext';
import { formatToDDMMYYYY, normalizeDayName } from '../utils/dateUtils';

const CeldaAusencias = ({ ausencias }) => (
    <View style={[styles.column, styles.infoColumn]}>
        {ausencias.length > 0 ? (
            ausencias.map((a, index) => <Text key={`${a.profesor}-${index}`} style={styles.ausenciaText}>❌ {a.profesor}</Text>)
        ) : (
            <Text style={styles.sinAusenciaText}>Sin ausencias</Text>
        )}
    </View>
);

const CeldaGrupo = ({ ausencias, tramo }) => (
    <View style={[styles.column, styles.infoColumn, { alignItems: 'center' }]}>
        {ausencias.map((a, index) => {
            const slot = a.horas?.[String(tramo)];
            if (!slot) return null;
            return <Text key={`${a.profesor}-grupo-${index}`} style={[styles.grupoText, { marginBottom: 4 }]}>{slot.grupo || '—'}</Text>;
        })}
    </View>
);

const CeldaAula = ({ ausencias, tramo }) => (
    <View style={[styles.column, styles.infoColumn, { alignItems: 'center' }]}>
        {ausencias.map((a, index) => {
            const slot = a.horas?.[String(tramo)];
            if (!slot) return null;
            return <Text key={`${a.profesor}-aula-${index}`} style={[styles.aulaText, { marginBottom: 4 }]}>{slot.aula || '—'}</Text>;
        })}
    </View>
);

const CeldaTarea = ({ ausencias, tramo }) => (
    <View style={[styles.column, styles.tareaColumn]}>
        {ausencias.map((a, index) => {
            const slot = a.horas?.[String(tramo)];
            if (!slot || !slot.tarea) return null;
            return <Text key={`${a.profesor}-tarea-${index}`} style={styles.tareaText}>📝 {slot.tarea}</Text>;
        })}
    </View>
);

const CeldaGuardia = ({ profesores }) => (
    <View style={[styles.column, styles.guardiaColumn]}>
        {profesores?.length > 0 ? (
            profesores.map((g, index) => {
                const listaProfes = Array.isArray(g.profesores)
                    ? g.profesores
                    : (typeof g.profesores === 'string' ? g.profesores.split(/[;,]/).map(p => p.trim()).filter(p => p) : []);

                return listaProfes.map((nombreProfesor, pIndex) => (
                    <Text key={`${index}-${pIndex}`} style={styles.guardiaText}>👨‍🏫 {nombreProfesor}</Text>
                ));
            })
        ) : (
            <Text style={styles.sinGuardiaText}>Sin asignar</Text>
        )}
    </View>
);

const CeldaHorario = ({ horario, esTramoActual }) => {
    const { theme } = useAppContext();
    return (
        <View style={[styles.column, styles.horarioColumn]}>
            <Text style={[styles.tramoText, { color: theme.text }]}>{horario.tramo}</Text>
            {esTramoActual && <Text style={styles.ahoraText}>AHORA</Text>}
            <Text style={styles.horarioText}>{horario.inicio} - {horario.fin}</Text>
        </View>
    );
};

const TramoRow = ({ tramo, ausencias, guardia, esTramoActual }) => {
    const esRecreo = tramo.tramo === 'RECREO';

    const rowContentStyle = [
        styles.rowContent,
        esTramoActual && styles.currentHourContent,
        esRecreo && styles.recreoContent,
    ];

    return (
        <GlassCard
            onPress={() => { }}
            intensity={esTramoActual ? 40 : 20}
            style={[
                styles.glassContainer,
                esTramoActual && { borderColor: '#3b82f6', borderWidth: 2 },
            ]}
        >
            <View style={rowContentStyle}>
                <CeldaHorario horario={tramo} esTramoActual={esTramoActual} />
                <CeldaAusencias ausencias={ausencias} />
                <CeldaGrupo ausencias={ausencias} tramo={tramo.tramo} />
                <CeldaAula ausencias={ausencias} tramo={tramo.tramo} />
                <CeldaTarea ausencias={ausencias} tramo={tramo.tramo} />
                <CeldaGuardia profesores={guardia} />
            </View>
        </GlassCard>
    );
};

const GuardiaScreen = ({ isGuardiaOverride, onCancelOverride, overrideTimeLeft }) => {
    const { datosAusencias, config, guardiasPorTramo, currentDate, theme, isDark } = useAppContext();
    const { urlAusencias } = config;

    const diaActual = DIAS_SEMANA[currentDate.getDay()];
    const diaActualNormalizado = normalizeDayName(diaActual);
    const guardiasDeHoy = guardiasPorTramo[diaActualNormalizado] || {};

    const datosFiltrados = useMemo(() => {
        const hoyStr = formatToDDMMYYYY(currentDate);
        const ausenciasHoy = datosAusencias.filter(a => formatToDDMMYYYY(a.fecha) === hoyStr);
        return { ausenciasHoy };
    }, [datosAusencias, currentDate]);

    const horariosVisibles = useMemo(() => {
        if (!config.horarios) return [];
        const horaActualMin = currentDate.getHours() * 60 + currentDate.getMinutes();

        return config.horarios.filter(horario => {
            const [finH, finM] = horario.fin.split(':').map(Number);
            const finMin = finH * 60 + finM;
            return finMin > horaActualMin;
        });
    }, [config.horarios, currentDate]);

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={[styles.title, { color: theme.text }]}>Cuadrante de Guardias I.E.S. "Fuerte de Cortadura"</Text>

                {isGuardiaOverride && (
                    <Pressable
                        style={({ pressed, focused }) => [
                            styles.cancelButton,
                            (pressed || focused) && styles.cancelButtonFocused
                        ]}
                        onPress={onCancelOverride}
                        focusable={true}
                    >
                        <Text style={styles.cancelButtonText}>
                            ⏹ Cancelar Espera ({Math.floor((overrideTimeLeft || 0) / 60)}:{(overrideTimeLeft % 60 || 0).toString().padStart(2, '0')})
                        </Text>
                    </Pressable>
                )}
            </View>

            {Object.keys(guardiasDeHoy).length === 0 && (
                <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>⚠️ No hay guardias para hoy ({diaActualNormalizado})</Text>
                    <Text style={styles.warningSubtext}>Hoy es {diaActualNormalizado}. Si es fin de semana, es normal no ver datos.</Text>
                </View>
            )}

            <FlatList
                data={horariosVisibles}
                renderItem={({ item: horario }) => {
                    const tramoId = String(horario.tramo);
                    const horaActualMin = currentDate.getHours() * 60 + currentDate.getMinutes();
                    const [inicioH, inicioM] = horario.inicio.split(':').map(Number);
                    const [finH, finM] = horario.fin.split(':').map(Number);
                    const inicioMin = inicioH * 60 + inicioM;
                    const finMin = finH * 60 + finM;
                    const esTramoActual = horaActualMin >= inicioMin && horaActualMin < finMin;

                    const ausenciasDelTramo = datosFiltrados.ausenciasHoy.filter(a => a.horas && a.horas[tramoId]);
                    const guardiasParaEsteTramo = guardiasDeHoy[tramoId] || [];

                    return <TramoRow tramo={horario} ausencias={ausenciasDelTramo} guardia={guardiasParaEsteTramo} esTramoActual={esTramoActual} />;
                }}
                keyExtractor={item => item.tramo.toString()}
                ListHeaderComponent={() => (
                    <View style={[styles.headerRow, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
                        <Text style={[styles.headerText, { flex: 1.2, color: theme.textSecondary }]}>Horario</Text>
                        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Ausencias</Text>
                        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Grupo</Text>
                        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Aula</Text>
                        <Text style={[styles.headerText, { flex: 1.5, color: theme.textSecondary }]}>Tareas</Text>
                        <Text style={[styles.headerText, { color: theme.textSecondary }]}>Docentes de Guardia</Text>
                    </View>
                )}
                extraData={currentDate}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListEmptyComponent={() => (
                    <View style={styles.emptyListContainer}>
                        <Text style={styles.emptyListText}>🏁 No quedan tramos horarios pendientes para hoy.</Text>
                    </View>
                )}
            />


        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 12 },
    headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', flex: 1 },
    cancelButton: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 10, borderWidth: 1, borderColor: '#fca5a5' },
    cancelButtonFocused: { backgroundColor: '#dc2626', transform: [{ scale: 1.05 }] },
    cancelButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    warningContainer: { padding: 15, backgroundColor: 'rgba(234, 179, 8, 0.1)', marginBottom: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eab308' },
    warningText: { color: '#fcd34d', fontSize: 18, fontWeight: 'bold' },
    warningSubtext: { color: '#94a3b8', marginTop: 4, fontSize: 14 },
    headerRow: { flexDirection: 'row', backgroundColor: '#334155', paddingVertical: 12, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
    headerText: { color: '#cbd5e1', fontWeight: 'bold', textAlign: 'center', flex: 1, fontSize: 18 },
    glassContainer: { marginBottom: 12 },
    rowContent: { flexDirection: 'row', padding: 5 },
    currentHourContent: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
    recreoContent: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
    column: { flex: 1, padding: 12, justifyContent: 'center' },
    horarioColumn: { flex: 1.2, alignItems: 'center' },
    infoColumn: { flex: 1 },
    tareaColumn: { flex: 1.5 },
    guardiaColumn: { flex: 1, alignItems: 'flex-start' },
    tramoText: { fontSize: 32, fontWeight: 'bold' },
    ahoraText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
    horarioText: { color: '#94a3b8', fontSize: 20 },
    ausenciaText: { color: '#f87171', fontSize: 20, marginBottom: 6, fontWeight: '500' },
    sinAusenciaText: { color: '#4ade80', fontStyle: 'italic', fontSize: 18 },
    grupoText: { backgroundColor: '#7c3aed', color: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 21, fontWeight: 'bold' },
    aulaText: { backgroundColor: '#0891b2', color: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 21, fontWeight: 'bold' },
    tareaText: { color: '#f59e0b', fontSize: 20 },
    guardiaText: {
        color: '#34d399',
        fontWeight: '600',
        fontSize: 22,
        marginBottom: 6,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(52, 211, 153, 0.2)',
        width: '100%'
    },
    sinGuardiaText: { color: '#64748b', fontStyle: 'italic', fontSize: 16 },
    emptyListContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        marginTop: 20,
    },
    emptyListText: {
        color: '#94a3b8',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default GuardiaScreen;
