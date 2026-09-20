// screens/ResumenScreen.js
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import { DIAS_SEMANA, ORDEN_TRAMOS } from '../constants/appConstants';
import { useAppContext } from '../context/AppContext';
import { useSchoolSchedule } from '../hooks/useSchoolSchedule';
import { formatToDDMMYYYY, normalizeDayName } from '../utils/dateUtils';


const ResumenCard = ({ icon, value, label, color }) => {
    const { theme } = useAppContext();
    return (
        <GlassCard
            style={[styles.card, { borderLeftColor: color }]}
            intensity={20}
            onPress={() => { }}
        >
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={[styles.cardValue, { color }]}>{value}</Text>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{label}</Text>
        </GlassCard>
    );
};

const AusenciaTramoItem = ({ tramo, profesores }) => {
    const { theme, isDark } = useAppContext();
    const esRecreo = tramo === 'RECREO';

    return (
        <View style={[styles.tramoRow, esRecreo && styles.tramoRowRecreo]}>
            {/* Número del Tramo - Grande y Visible */}
            <View style={[styles.tramoNumero, { backgroundColor: esRecreo ? '#f59e0b' : '#3b82f6' }]}>
                <Text style={styles.tramoNumeroText}>{esRecreo ? '☕' : tramo}</Text>
            </View>

            {/* Lista de Profesores */}
            <View style={styles.profesoresList}>
                {profesores.map((profesor, index) => {
                    const nombreFormateado = profesor.includes(',')
                        ? profesor.split(',').map(p => p.trim()).reverse().join(' ')
                        : profesor;

                    return (
                        <Text
                            key={index}
                            style={[styles.profesorText, { color: theme.text }]}
                            numberOfLines={1}
                        >
                            • {nombreFormateado}
                        </Text>
                    );
                })}
            </View>
        </View>
    );
};

const ResumenScreen = () => {
    const { guardiasPorTramo, datosAusencias, datosActividades, currentDate, theme } = useAppContext();
    const { currentTramoIndex } = useSchoolSchedule();

    const { resumen, ausenciasPorTramo } = useMemo(() => {
        const today = new Date();
        const diaActual = DIAS_SEMANA[today.getDay()];
        const hoyStr = formatToDDMMYYYY(today);

        // Obtener las guardias para el día de hoy desde la estructura agrupada
        const guardiasDeHoy = guardiasPorTramo[normalizeDayName(diaActual)] || {};

        const ausenciasHoy = (datosAusencias || []).filter(a => {
            if (!a.fecha) return false;
            const d = new Date(a.fecha);
            return formatToDDMMYYYY(d) === hoyStr;
        });

        const actividadesHoy = (datosActividades || []).filter(a => {
            if (!a.fecha) return false;
            const d = new Date(a.fecha);
            return formatToDDMMYYYY(d) === hoyStr;
        });



        // Contar el total de profesores de guardia para hoy
        const totalGuardias = Object.values(guardiasDeHoy)
            .flat()
            .reduce((total, guardia) => {
                const profes = guardia.profesores;
                if (Array.isArray(profes)) {
                    return total + profes.length;
                }
                if (typeof profes === 'string') {
                    return total + profes.split(/[;,]/).filter(p => p.trim()).length;
                }
                return total;
            }, 0);

        // ✅ NUEVO: Agrupar ausencias por tramo
        const ausenciasPorTramoMap = {};
        ausenciasHoy.forEach(ausencia => {
            Object.keys(ausencia.horas || {}).forEach(tramo => {
                // Solo mostrar tramos que no han pasado
                if (ORDEN_TRAMOS.indexOf(tramo) >= currentTramoIndex) {
                    if (!ausenciasPorTramoMap[tramo]) {
                        ausenciasPorTramoMap[tramo] = [];
                    }
                    ausenciasPorTramoMap[tramo].push(ausencia.profesor);
                }
            });
        });

        // Conteo de ausencias únicas para hoy (por profesor)
        const totalAusenciasHoy = ausenciasHoy.reduce((acc, a) => {
            const p = a.profesor;
            if (Array.isArray(p)) {
                p.forEach(pp => acc.add(pp));
            } else if (p) {
                acc.add(p);
            }
            return acc;
        }, new Set()).size;

        // Ordenar por orden de tramos
        const ausenciasPorTramoOrdenado = ORDEN_TRAMOS
            .filter(tramo => ausenciasPorTramoMap[tramo])
            .map(tramo => ({
                tramo,
                profesores: [...new Set(ausenciasPorTramoMap[tramo])] // Eliminar duplicados
            }));

        return {
            resumen: { totalAusencias: totalAusenciasHoy, totalGuardias, totalActividades: actividadesHoy.length },
            ausenciasPorTramo: ausenciasPorTramoOrdenado
        };
    }, [guardiasPorTramo, datosAusencias, datosActividades, currentDate, currentTramoIndex]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={[styles.title, { color: theme.text }]}>📊 Resumen del Día</Text>

            {/* Tarjetas de Resumen */}
            <View style={styles.cardContainer}>
                <ResumenCard
                    icon="❌"
                    value={resumen.totalAusencias}
                    label="Docentes Ausentes"
                    color="#f87171"
                />
                <ResumenCard
                    icon="👨‍🏫"
                    value={resumen.totalGuardias}
                    label="Docentes de Guardia"
                    color="#34d399"
                />
                <ResumenCard
                    icon={resumen.totalActividades > 0 ? "🎯" : "🗓️"}
                    value={resumen.totalActividades}
                    label="Actividades Hoy"
                    color={resumen.totalActividades > 0 ? "#f59e0b" : "#94a3b8"}
                />
            </View>

            {/* ✅ NUEVO: Detalle de Ausencias por Tramo */}
            {ausenciasPorTramo.length > 0 && (
                <View style={styles.detalleSection}>
                    <Text style={[styles.detalleTitle, { color: theme.text }]}>
                        📋 Ausencias por Tramo
                    </Text>
                    <View style={styles.tramosContainer}>
                        {ausenciasPorTramo.map(({ tramo, profesores }) => (
                            <AusenciaTramoItem
                                key={tramo}
                                tramo={tramo}
                                profesores={profesores}
                            />
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 80,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    cardContainer: {
        flexDirection: 'row',
        gap: 24,
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    card: {
        flex: 1,
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 8,
        minWidth: 200,
    },
    cardIcon: {
        fontSize: 60,
        marginBottom: 15,
    },
    cardValue: {
        fontSize: 90,
        fontWeight: 'bold',
        ...Platform.select({
            web: {
                textShadow: '2px 2px 5px rgba(0, 0, 0, 0.5)',
            },
            default: {
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 5,
            },
        }),
    },
    cardLabel: {
        fontSize: 22,
        marginTop: 8,
        fontWeight: '600',
        textAlign: 'center',
    },
    // ✅ NUEVO: Estilos para detalle de ausencias
    detalleSection: {
        marginTop: 20,
    },
    detalleTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    tramosContainer: {
        gap: 15,
    },
    tramoRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(51, 65, 85, 0.3)',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    tramoRowRecreo: {
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    tramoNumero: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    tramoNumeroText: {
        fontSize: 56,
        fontWeight: 'bold',
        color: 'white',
        ...Platform.select({
            web: {
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
            },
            default: {
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 4,
            },
        }),
    },
    profesoresList: {
        flex: 1,
        paddingVertical: 15,
        paddingHorizontal: 20,
        justifyContent: 'center',
        gap: 8,
    },
    profesorText: {
        fontSize: 22,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
        padding: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 20,
    },
    emptyIcon: {
        fontSize: 80,
    },
    emptyText: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 20,
    },
});

export default ResumenScreen;
