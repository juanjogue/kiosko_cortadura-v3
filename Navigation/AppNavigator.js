// navigation/AppNavigator.js
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAudioPlayer } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { useSchoolSchedule } from '../hooks/useSchoolSchedule';

// Importa tus pantallas
import ActividadesScreen from '../screen/ActividadesScreen';
import AusenciasScreen from '../screen/AusenciasScreen';
import ConfigScreen from '../screen/ConfigScreen';
import GalleryScreen from '../screen/GalleryScreen';
import GuardiaScreen from '../screen/GuardiaScreen';
import ResumenScreen from '../screen/ResumenScreen';
import RssScreen from '../screen/RssScreen';
import WeatherScreen from '../screen/WeatherScreen';
import WebViewScreen from '../screen/WebViewScreen';
// ... otras pantallas

const Stack = createStackNavigator();

// Componente que gestiona la rotación de pantallas
const MainFlow = () => {
    const navigation = useNavigation();
    const { config, currentDate, theme, isDark } = useAppContext(); // ✅ Obtener la configuración y la hora actual

    // ✅ NUEVO: Inicializar reproductor de audio (Reemplaza expo-av)
    // Usar sonido personalizado si existe, sino el default
    // ✅ FIX WEB: Manejar correctamente los assets de audio en Web (require devuelve string)
    const getSoundSource = (customUri) => {
        if (customUri) return { uri: customUri };
        const asset = require('../assets/sounds/notification.mp3');
        if (typeof asset === 'string') return { uri: asset };
        return asset;
    };

    const soundSource = getSoundSource(config.customSoundUri);
    const player = useAudioPlayer(soundSource);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);

    // ✅ OPTIMIZACIÓN TV: Estado para la barra de progreso en Android TV
    const [progressValue, setProgressValue] = useState(0);

    const fadeAnim = useRef(new Animated.Value(1)).current; // Opacidad inicial: 1 (visible)
    const slideAnim = useRef(new Animated.Value(0)).current; // Posición inicial: 0
    // ✅ FIX: Definimos progressAnim que faltaba y causaba pantalla blanca
    const progressAnim = useRef(new Animated.Value(0)).current;

    // ✅ CORRECCIÓN: Lógica para determinar las pantallas activas
    const pantallasActivas = React.useMemo(() => {
        const pantallas = [];

        // ✅ NUEVO: La pantalla de Guardia ahora es opcional
        if (config.mostrarGuardias) {
            pantallas.push({ name: 'Guardia', component: GuardiaScreen });
        }

        // Añade otras pantallas basadas en la configuración
        if (config.mostrarAusencias) {
            pantallas.push({ name: 'Ausencias', component: AusenciasScreen });
        }
        if (config.mostrarResumen) {
            pantallas.push({ name: 'Resumen', component: ResumenScreen });
        }
        if (config.mostrarActividades) {
            pantallas.push({ name: 'Actividades', component: ActividadesScreen });
        }
        if (config.mostrarGaleria) {
            pantallas.push({ name: 'Galeria', component: GalleryScreen });
        }
        // Añadir WebViews si están habilitadas y tienen URL
        if (config.web1Enabled && config.urlWeb1) {
            pantallas.push({ name: 'Web1', component: WebViewScreen, params: { url: config.urlWeb1, title: config.tituloWeb1 } });
        }
        if (config.web2Enabled && config.urlWeb2) {
            pantallas.push({ name: 'Web2', component: WebViewScreen, params: { url: config.urlWeb2, title: config.tituloWeb2 } });
        }
        // Añadir pantalla RSS si está habilitada
        if (config.rssEnabled && config.urlRss) {
            pantallas.push({ name: 'RSS', component: RssScreen, params: { url: config.urlRss, title: config.tituloRss } });
        }
        // Añadir pantalla del Tiempo si está habilitada
        if (config.weatherEnabled && config.weatherLat && config.weatherLon) {
            pantallas.push({
                name: 'Tiempo',
                component: WeatherScreen,
                params: {
                    lat: config.weatherLat,
                    lon: config.weatherLon,
                    city: config.weatherCity
                }
            });
        }

        const activeNames = pantallas.map(p => p.name);

        // 🔍 DEBUG LOGS
        console.log('--- 🖥️ ESTADO DE ROTACIÓN ---');
        console.log('✅ Pantallas activas:', activeNames);
        console.log('📰 RSS Config:', { enabled: config.rssEnabled, hasUrl: !!config.urlRss, urlLength: config.urlRss?.length });

        if (!config.rssEnabled) console.log('⚠️ RSS está desactivado en config');
        if (!config.urlRss) console.log('⚠️ RSS no tiene URL configurada');
        console.log('-----------------------------');

        return pantallas;
    }, [config]);

    const [indicePantalla, setIndicePantalla] = useState(0);
    const [configFocused, setConfigFocused] = useState(false); // Estado para el foco del botón en TV

    // ✅ NUEVO: Lógica para forzar pantalla de Guardia al cambiar de tramo
    const [isGuardiaOverride, setIsGuardiaOverride] = useState(false);
    const [overrideTimeLeft, setOverrideTimeLeft] = useState(0); // Estado para la cuenta atrás
    const lastTramoRef = useRef(null);
    const overrideTimeoutRef = useRef(null);

    const { currentTramo, currentTramoIndex, progress: tramoProgress } = useSchoolSchedule();

    // Efecto para detectar cambio de tramo
    useEffect(() => {
        const currentTramoId = currentTramo?.tramo;

        // Inicialización (primera carga)
        if (lastTramoRef.current === null) {
            lastTramoRef.current = currentTramoId;
            return;
        }

        // Si el tramo ha cambiado, forzamos la pantalla de Guardia
        if (currentTramoId !== lastTramoRef.current) {
            console.log(`🔄 Cambio de tramo detectado. Forzando pantalla de Guardia.`);
            lastTramoRef.current = currentTramoId;

            // ✅ Solo activar si está habilitado en la configuración
            if (config.guardiaOverrideEnabled) {
                // ✅ NUEVO: Buscar si la pantalla de Guardia está activa en la rotación
                const guardiaIndex = pantallasActivas.findIndex(p => p.name === 'Guardia');

                // Solo activar el override si la pantalla de Guardia está habilitada
                if (guardiaIndex !== -1) {
                    // Reproducir sonido si está habilitado
                    if (config.guardiaOverrideSoundEnabled && player) {
                        player.loop = config.guardiaOverrideSoundLoop;
                        player.play();
                    }

                    setIsGuardiaOverride(true);
                    setIndicePantalla(guardiaIndex); // ✅ Usar el índice dinámico encontrado
                    setOverrideTimeLeft(config.guardiaOverrideDuration || 300);

                    if (overrideTimeoutRef.current) clearInterval(overrideTimeoutRef.current);

                    // Iniciar cuenta atrás
                    overrideTimeoutRef.current = setInterval(() => {
                        setOverrideTimeLeft(prev => {
                            if (prev <= 1) {
                                clearInterval(overrideTimeoutRef.current);
                                if (player) {
                                    player.pause(); // Detener sonido al acabar
                                    player.seekTo(0);
                                }
                                setIsGuardiaOverride(false); // Volver a rotación normal
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                }
            }
        }
    }, [currentDate, config.horarios, config.guardiaOverrideEnabled, config.guardiaOverrideDuration, config.guardiaOverrideSoundEnabled, config.guardiaOverrideSoundLoop, soundSource, pantallasActivas]);

    // Limpieza del intervalo al desmontar
    useEffect(() => {
        return () => {
            if (overrideTimeoutRef.current) clearInterval(overrideTimeoutRef.current);
            // El hook useAudioPlayer maneja la limpieza automáticamente
        };
    }, []);

    // ✅ NUEVO: Función para cancelar manualmente la guardia fija
    const cancelOverride = () => {
        if (player) {
            player.pause(); // Detener el sonido
            player.seekTo(0);
        }
        setIsGuardiaOverride(false);
        setOverrideTimeLeft(0);
        if (overrideTimeoutRef.current) clearInterval(overrideTimeoutRef.current);
    };

    useEffect(() => {
        // Aseguramos que la pantalla sea visible al iniciar o al cambiar la configuración
        fadeAnim.setValue(1);

        // Si estamos en modo "Override" (Guardia fija), detenemos la rotación
        if (isGuardiaOverride) {
            progressAnim.setValue(1); // Barra llena para indicar estado fijo
            return;
        }

        // ✅ OPTIMIZACIÓN TV: Simplificar animación de progreso
        // En Android TV, usar una actualización más simple sin animación suave
        const isAndroidTV = Platform.OS === 'android' && Platform.isTV;

        if (isAndroidTV) {
            // Actualización discreta cada segundo en lugar de animación continua
            progressAnim.setValue(0);
            setProgressValue(0);
            let elapsed = 0;
            const interval = config.rotacionIntervalo || 15000;
            const progressInterval = setInterval(() => {
                elapsed += 1000;
                const newProgress = Math.min(elapsed / interval, 1);
                progressAnim.setValue(newProgress);
                setProgressValue(newProgress);
            }, 1000);

            // Limpiar al desmontar
            return () => clearInterval(progressInterval);
        } else {
            // Animación suave para otras plataformas
            progressAnim.setValue(0);
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: config.rotacionIntervalo || 15000,
                useNativeDriver: false, // width no soporta native driver
            }).start();
        }

        if (pantallasActivas.length <= 1) return;

        const rotationInterval = setInterval(() => {
            // ✅ OPTIMIZACIÓN TV: Simplificar transiciones en Android TV
            if (isAndroidTV) {
                // Transición simple sin animación para mejor rendimiento
                setIndicePantalla(prev => (prev + 1) % pantallasActivas.length);
                progressAnim.setValue(0);
            } else {
                // 1. Efecto de salida (Fade Out + Slide Left)
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: -50, // Pequeño desplazamiento a la izquierda
                        duration: 800,
                        useNativeDriver: true,
                    })
                ]).start(() => {
                    // 2. Cambiar el contenido
                    setIndicePantalla(prev => (prev + 1) % pantallasActivas.length);

                    // Reiniciar barra de progreso
                    progressAnim.setValue(0);
                    Animated.timing(progressAnim, {
                        toValue: 1,
                        duration: config.rotacionIntervalo || 15000,
                        useNativeDriver: false,
                    }).start();

                    // Preparar posición para entrada (viene desde la derecha)
                    slideAnim.setValue(50);

                    // 3. Efecto de entrada (Fade In + Slide to Center)
                    Animated.parallel([
                        Animated.timing(fadeAnim, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(slideAnim, {
                            toValue: 0,
                            duration: 800,
                            useNativeDriver: true,
                        })
                    ]).start();
                });
            }
        }, config.rotacionIntervalo || 15000);

        return () => clearInterval(rotationInterval);
    }, [pantallasActivas, config.rotacionIntervalo, isGuardiaOverride]);

    // Renderiza la pantalla actual basada en el índice
    const currentScreenInfo = pantallasActivas[indicePantalla];

    const handlePinSubmit = () => {
        if (pinInput === config.adminPin) {
            setShowPinModal(false);
            setPinInput('');
            setPinError(false);
            navigation.navigate('Config');
        } else {
            setPinError(true);
            setPinInput('');
            // Feedback visual: pequeño delay para que vean el error
            setTimeout(() => setPinError(false), 2000);
        }
    };

    if (!currentScreenInfo) {
        // Muestra la pantalla de configuración si no hay nada que mostrar
        return <ConfigScreen />;
    }

    const { component: CurrentScreenComponent, params } = currentScreenInfo;

    // Simulamos el paso de `route.params` a la pantalla, necesario para WebViewScreen
    const route = { params: params || {} };

    // ✅ OPTIMIZACIÓN TV: Usar barras de progreso simples en Android TV
    const isAndroidTV = Platform.OS === 'android' && Platform.isTV;

    return (
        // ✅ FIX WEB: Forzar altura 100vh en web para evitar pantalla blanca
        <View style={{ flex: 1, backgroundColor: theme.background, ...(Platform.OS === 'web' ? { height: '100vh' } : {}) }}>

            {/* 📊 BARRA DE ROTACIÓN (Pantallas) */}
            <View style={{ height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', width: '100%', position: 'absolute', top: 0, zIndex: 50 }}>
                {isAndroidTV ? (
                    // Barra simple sin animación para TV
                    <View style={{
                        height: '100%',
                        backgroundColor: isGuardiaOverride ? '#f59e0b' : '#3b82f6',
                        width: `${progressValue * 100}%`
                    }} />
                ) : (
                    // Barra animada para otras plataformas
                    <Animated.View style={{
                        height: '100%',
                        backgroundColor: isGuardiaOverride ? '#f59e0b' : '#3b82f6',
                        width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%']
                        })
                    }} />
                )}
            </View>

            {/* 🏫 BARRA DE CLASE (Progreso del tramo actual) */}
            <View style={{ height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', width: '100%', position: 'absolute', top: 8, zIndex: 50 }}>
                <View style={{
                    height: '100%',
                    backgroundColor: '#10b981', // Verde esmeralda para diferenciar de la rotación
                    width: `${tramoProgress * 100}%`
                }} />
            </View>

            {isAndroidTV ? (
                // Sin animaciones de transición en TV para mejor rendimiento
                <View style={{ flex: 1 }}>
                    <CurrentScreenComponent
                        route={route}
                        isGuardiaOverride={isGuardiaOverride}
                        onCancelOverride={cancelOverride}
                        overrideTimeLeft={overrideTimeLeft}
                    />
                </View>
            ) : (
                // Con animaciones en otras plataformas
                <Animated.View style={{
                    flex: 1,
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }]
                }}>
                    <CurrentScreenComponent
                        route={route}
                        isGuardiaOverride={isGuardiaOverride}
                        onCancelOverride={cancelOverride}
                        overrideTimeLeft={overrideTimeLeft}
                    />
                </Animated.View>
            )}

            {/* ✅ MEJORA TV: Botón accesible con mando a distancia (Focusable) */}
            <Pressable
                style={[styles.configButton, configFocused && styles.configButtonFocused]}
                onPress={() => setShowPinModal(true)}
                onFocus={() => setConfigFocused(true)}
                onBlur={() => setConfigFocused(false)}
                focusable={true} // ✅ IMPORTANTE: Permite que el mando de la TV lo seleccione
            >
                <Text style={styles.configButtonText}>⚙️</Text>
            </Pressable>

            {/* MODAL PARA PIN DE ADMINISTRADOR */}
            <Modal
                visible={showPinModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPinModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Acceso Administrador</Text>
                        <Text style={styles.modalSubtitle}>Introduce el PIN para configurar</Text>

                        <TextInput
                            style={[styles.pinInput, pinError && styles.pinInputError]}
                            value={pinInput}
                            onChangeText={setPinInput}
                            placeholder="PIN"
                            placeholderTextColor="#475569"
                            keyboardType="numeric"
                            secureTextEntry={true}
                            autoFocus={true}
                            maxLength={8}
                            onSubmitEditing={handlePinSubmit}
                        />

                        {pinError && <Text style={styles.errorText}>PIN incorrecto</Text>}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowPinModal(false);
                                    setPinInput('');
                                    setPinError(false);
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handlePinSubmit}
                            >
                                <Text style={styles.modalButtonText}>Acceder</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default function AppNavigator() { // ✅ CORRECCIÓN: Devolver un solo Stack.Navigator
    return (
        // ✅ FIX WEB: Envolver el Navigator en una View con altura explícita para Web
        <View style={{ flex: 1, ...(Platform.OS === 'web' ? { height: '100vh' } : {}) }}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Kiosco Cortadura">
                <Stack.Screen name="Kiosco Cortadura" component={MainFlow} />
                <Stack.Screen name="Config" component={ConfigScreen} />
            </Stack.Navigator>
        </View>
    );
}

const styles = StyleSheet.create({
    configButton: {
        position: 'absolute',
        bottom: 80, // ✅ Subido para no solapar con GlobalAlert ticker
        right: 20,
        backgroundColor: 'rgba(30, 41, 59, 0.8)', // Fondo oscuro semitransparente
        padding: 12,
        borderRadius: 50,
        borderWidth: 1,
        borderColor: '#475569',
        zIndex: 100, // Asegura que esté por encima de todo
    },
    configButtonFocused: {
        backgroundColor: '#3b82f6', // Azul brillante al tener foco
        transform: [{ scale: 1.2 }], // Efecto de zoom para verlo mejor en TV
        borderColor: 'white',
        borderWidth: 2,
        boxShadow: '0px 0px 15px #3b82f6',
    },
    configButtonText: {
        fontSize: 24,
    },
    overrideBadge: {
        position: 'absolute',
        bottom: 80, // ✅ Movido abajo para evitar solapar con el título/cabecera
        left: 20,   // ✅ Movido a la izquierda para no estorbar
        backgroundColor: 'rgba(245, 158, 11, 0.9)', // Fondo Ámbar semitransparente
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        zIndex: 60,
        borderWidth: 1,
        borderColor: '#fcd34d',
        elevation: 5,
    },
    overrideText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    alertBanner: {
        flexDirection: 'row',
        backgroundColor: '#ef4444', // Rojo intenso para llamar la atención
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50, // Asegura que esté por encima del contenido
        elevation: 5,
    },
    alertIcon: {
        fontSize: 20,
        marginRight: 10,
        color: 'white',
    },
    alertText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        textAlign: 'center',
        flex: 1,
    },
    // Estilos para el Modal de PIN
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        ...(Platform.OS === 'web' ? { cursor: 'default' } : {}),
    },
    modalContent: {
        backgroundColor: '#1e293b',
        padding: 40,
        borderRadius: 20,
        width: Platform.OS === 'web' ? 400 : '80%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        elevation: 10,
        boxShadow: '0px 10px 20px rgba(0,0,0,0.5)',
    },
    modalTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 18,
        color: '#94a3b8',
        marginBottom: 30,
    },
    pinInput: {
        backgroundColor: '#0f172a',
        color: 'white',
        width: '100%',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        fontSize: 24,
        textAlign: 'center',
        borderWidth: 2,
        borderColor: '#334155',
        marginBottom: 10,
    },
    pinInputError: {
        borderColor: '#ef4444',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    cancelButton: {
        backgroundColor: '#334155',
    },
    confirmButton: {
        backgroundColor: '#3b82f6',
    },
    modalButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
