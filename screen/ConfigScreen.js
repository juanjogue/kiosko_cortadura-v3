// screens/ConfigScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_CONFIG, useAppContext } from '../context/AppContext';

const CONFIG_STORAGE_KEY = 'kiosco_config';

const ConfigScreen = () => {
    const navigation = useNavigation();
    const { config: globalConfig, setConfig: setGlobalConfig, isLoading, cargarTodosLosDatos, lastUpdateSuccess } = useAppContext();

    // Estado local para los campos del formulario
    const [localConfig, setLocalConfig] = useState(globalConfig);

    // ✅ NUEVO: Inicializar reproductor para probar sonido
    // Si hay un URI personalizado en la config local, lo usamos; si no, el de assets.
    const getSoundSource = (customUri) => {
        if (customUri) return { uri: customUri };
        const asset = require('../assets/sounds/notification.mp3');
        if (typeof asset === 'string') return { uri: asset };
        return asset;
    };
    const soundSource = getSoundSource(localConfig.customSoundUri);
    const player = useAudioPlayer(soundSource);

    // ✅ NUEVO: Player independiente para sonido de navegación
    // Usamos 'navigation.mp3' para diferenciarlo de la notificación
    const getNavSource = () => {
        const asset = require('../assets/sounds/navigation.mp3');
        if (typeof asset === 'string') return { uri: asset };
        return asset;
    };
    const navPlayer = useAudioPlayer(getNavSource());

    // ✅ NUEVO: Función para reproducir sonido al navegar (foco)
    const playNavSound = () => {
        if (navPlayer) {
            navPlayer.seekTo(0);
            navPlayer.play();
        }
    };

    // Cargar la configuración guardada al iniciar la pantalla
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const savedConfigJSON = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
                if (savedConfigJSON) {
                    const savedConfig = JSON.parse(savedConfigJSON);

                    // ✅ MEJORA: Merge robusto similar al de AppContext
                    const merged = { ...DEFAULT_CONFIG };
                    Object.keys(savedConfig).forEach(key => {
                        const val = savedConfig[key];
                        if (val !== undefined && val !== null && val !== '') {
                            merged[key] = val;
                        } else if (typeof DEFAULT_CONFIG[key] === 'boolean' && typeof val === 'boolean') {
                            merged[key] = val;
                        }
                    });

                    setLocalConfig(merged);
                }
            } catch (e) {
                console.error('Error al cargar configuración en ConfigScreen:', e);
            }
        };
        loadConfig();
    }, []);

    const handleInputChange = (key, value) => {
        setLocalConfig(prev => ({ ...prev, [key]: value }));
    };

    // ✅ NUEVO: Función para restaurar valores por defecto
    const handleRestoreDefaults = () => {
        Alert.alert(
            'Restaurar y Limpiar Todo',
            'Esto borrará toda la configuración personalizada y los datos guardados en caché. ¿Continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpiar Todo',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        setLocalConfig(DEFAULT_CONFIG);
                        Alert.alert('Reseteado', 'La memoria ha sido limpiada. Pulsa "Guardar y Empezar" para recargar todo.');
                    }
                }
            ]
        );
    };

    // ✅ NUEVO: Función para seleccionar archivo de audio
    const handlePickSound = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*', // Solo archivos de audio
                copyToCacheDirectory: true, // Copiar a caché para acceso persistente
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                handleInputChange('customSoundUri', result.assets[0].uri);
            }
        } catch (err) {
            Alert.alert('Error', 'No se pudo seleccionar el archivo de audio.');
        }
    };

    // ✅ NUEVO: Función para probar el sonido
    const handleTestSound = () => {
        if (player) player.play();
    };
    // PIN (separado para no mostrar el actual por seguridad)
    const [newPin, setNewPin] = useState('');

    const handleSaveAndStart = async () => {
        // ✅ NUEVO: Validación de URLs antes de guardar
        const urlFields = [
            { key: 'urlGuardias', label: 'URL de Guardias' },
            { key: 'urlAusencias', label: 'URL de Ausencias' },
            { key: 'urlAlertas', label: 'URL de Alertas' },
            { key: 'urlActividades', label: 'URL de Actividades' },
            { key: 'urlGaleria', label: 'URL de Galería', required: localConfig.mostrarGaleria },
            { key: 'urlWeb1', label: 'URL Página Web 1', required: localConfig.web1Enabled },
            { key: 'urlWeb2', label: 'URL Página Web 2', required: localConfig.web2Enabled },
        ];

        for (const field of urlFields) {
            const url = localConfig[field.key];
            if (field.required && (!url || !url.trim())) {
                Alert.alert('Campo Requerido', `El campo "${field.label}" es obligatorio.`);
                return;
            }
            if (url && url.trim()) {
                try {
                    new URL(url);
                } catch (e) {
                    Alert.alert('URL Inválida', `La "${field.label}" no es válida.\nAsegúrate de incluir http:// o https://`);
                    return;
                }
            }
        }

        try {
            // Asegurarse de que los valores numéricos son números
            const configToSave = {
                ...localConfig,
                rotacionIntervalo: Number(localConfig.rotacionIntervalo) || 15000,
                actualizacionDatos: Number(localConfig.actualizacionDatos) || 30000,
                guardiaOverrideDuration: Number(localConfig.guardiaOverrideDuration) || 300,
                galeriaIntervalo: Number(localConfig.galeriaIntervalo) || 7000,
                // ✅ SEGURIDAD: Solo actualizar PIN si el usuario escribió algo nuevo
                adminPin: newPin && newPin.trim() !== '' ? newPin : localConfig.adminPin
            };

            await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
            setGlobalConfig(configToSave); // Actualizar el estado global de la config

            // Iniciar la carga de datos
            await cargarTodosLosDatos(configToSave);

            Alert.alert('Listo', 'Configuración guardada y datos cargados.');
            navigation.navigate('Kiosco Cortadura'); // Navegar a la pantalla principal
        } catch (e) {
            Alert.alert('Error', 'No se pudo guardar la configuración.');
        } finally {
            // isLoading será manejado por el contexto
        }
    };

    return (
        <View style={styles.mainContainer}>
            {/* ✅ FIX WEB: Inyectar CSS para forzar barra de scroll visible en TV */}
            {Platform.OS === 'web' && (
                <style type="text/css">{`
                    ::-webkit-scrollbar {
                        width: 16px;
                    }
                    ::-webkit-scrollbar-track {
                        background: #0f172a; 
                    }
                    ::-webkit-scrollbar-thumb {
                        background-color: #475569;
                        border-radius: 8px;
                        border: 2px solid #0f172a;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background-color: #64748b;
                    }
                `}</style>
            )}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                persistentScrollbar={true}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
            >
                <Text style={styles.title}>⚙️ Configuración del Kiosco del I.E.S. "Fuerte de Cortadura"</Text>

                {lastUpdateSuccess && (
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusText}>✅ Última actualización: {lastUpdateSuccess.toLocaleTimeString()}</Text>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>URLs de Google Sheets</Text>
                    <InputItem
                        label="URL de Guardias"
                        value={localConfig.urlGuardias || ''}
                        onChangeText={text => handleInputChange('urlGuardias', text)}
                        placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-1vTys484unlw9HouZLvfaT1HeV9zdn24jGzcT-F7__EMQG-0tuu1ylXHg6MpklCkwQDojfed4B8aKDot/pub?output=csv"
                    />
                    <InputItem
                        label="URL de Ausencias"
                        value={localConfig.urlAusencias || ''}
                        onChangeText={text => handleInputChange('urlAusencias', text)}
                        placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-1vShyK5np1YxNiTfE36yvmR05zFO4ji0-_YW-6UMmKJ3AopDDsZW5Hz1lmzcNfyadtt51-gs5aNx4XER/pub?gid=2111711524&single=true&output=csv"
                    />
                    <InputItem
                        label="URL de Alertas"
                        value={localConfig.urlAlertas || ''}
                        onChangeText={text => handleInputChange('urlAlertas', text)}
                        placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-1vTv9D9yD--6U2rS7LcPy8lwc9O0THHUU96UPju2y4US4bW5OXAe-70sPcV95gW0XfdEE72D3WnExMVr/pub?output=csv"
                    />
                    <InputItem
                        label="URL de Actividades"
                        value={localConfig.urlActividades || ''}
                        onChangeText={text => handleInputChange('urlActividades', text)}
                        placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-1vRU6-MIrAOXPRcRArrkMECyDdtxBFmezookCWJtjBJ9_eQOpZ_An7H3ZiJqr1_-k0L-Tp3cHvyve5lk/pub?output=csv"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tiempos y Rotación</Text>
                    <InputItem
                        label="Intervalo de Rotación (milisegundos)"
                        value={String(localConfig.rotacionIntervalo)}
                        onChangeText={text => handleInputChange('rotacionIntervalo', text)}
                        keyboardType="numeric"
                    />
                    <InputItem
                        label="Intervalo de Actualización de Datos (milisegundos)"
                        value={String(localConfig.actualizacionDatos)}
                        onChangeText={text => handleInputChange('actualizacionDatos', text)}
                        keyboardType="numeric"
                    />
                    <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 15 }} />
                    <SwitchItem
                        label="Fijar pantalla de Guardia al cambiar de tramo"
                        value={localConfig.guardiaOverrideEnabled}
                        onValueChange={val => handleInputChange('guardiaOverrideEnabled', val)}
                    />
                    <InputItem
                        label="Duración de pantalla fija (segundos)"
                        value={String(localConfig.guardiaOverrideDuration || 300)}
                        onChangeText={text => handleInputChange('guardiaOverrideDuration', text)}
                        keyboardType="numeric"
                        editable={localConfig.guardiaOverrideEnabled}
                    />
                    <SwitchItem
                        label="Sonido al fijar pantalla de Guardia"
                        value={localConfig.guardiaOverrideSoundEnabled}
                        onValueChange={val => handleInputChange('guardiaOverrideSoundEnabled', val)}
                        disabled={!localConfig.guardiaOverrideEnabled}
                    />
                    <SwitchItem
                        label="Repetir sonido (bucle)"
                        value={localConfig.guardiaOverrideSoundLoop}
                        onValueChange={val => handleInputChange('guardiaOverrideSoundLoop', val)}
                        disabled={!localConfig.guardiaOverrideEnabled}
                    />

                    {/* Selector de Sonido Personalizado */}
                    <View style={{ marginTop: 15, alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: '#cbd5e1', fontSize: 18, marginBottom: 5 }}>
                            Sonido actual: {localConfig.customSoundUri ? '📁 Personalizado' : '🔔 Predeterminado'}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TVButton
                                title="📂 Elegir Archivo"
                                onPress={handlePickSound}
                                onFocus={playNavSound}
                                style={{ backgroundColor: '#334155', paddingVertical: 10, paddingHorizontal: 20 }}
                            />
                            {localConfig.customSoundUri && (
                                <TVButton
                                    title="↺ Reset"
                                    onPress={() => handleInputChange('customSoundUri', null)}
                                    onFocus={playNavSound}
                                    style={{ backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 20 }}
                                />
                            )}
                        </View>

                        <TVButton
                            title="🔊 Probar Sonido"
                            onPress={handleTestSound}
                            onFocus={playNavSound}
                            style={{ backgroundColor: '#475569', paddingVertical: 10, width: '60%', marginTop: 5 }}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎨 Apariencia</Text>
                    <SwitchItem
                        label="Modo Oscuro"
                        value={localConfig.darkMode !== false}
                        onValueChange={val => handleInputChange('darkMode', val)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pantallas Adicionales</Text>
                    <SwitchItem
                        label="Mostrar Pantalla de Guardias"
                        value={localConfig.mostrarGuardias}
                        onValueChange={val => handleInputChange('mostrarGuardias', val)}
                    />
                    <SwitchItem
                        label="Mostrar Pantalla de Ausencias"
                        value={localConfig.mostrarAusencias}
                        onValueChange={val => handleInputChange('mostrarAusencias', val)}
                    />
                    <SwitchItem
                        label="Mostrar Pantalla de Resumen"
                        value={localConfig.mostrarResumen}
                        onValueChange={val => handleInputChange('mostrarResumen', val)}
                    />
                    <SwitchItem
                        label="Mostrar Pantalla de Actividades"
                        value={localConfig.mostrarActividades}
                        onValueChange={val => handleInputChange('mostrarActividades', val)}
                    />
                    <SwitchItem
                        label="Mostrar Pantalla de Galería / Cartelería"
                        value={localConfig.mostrarGaleria}
                        onValueChange={val => handleInputChange('mostrarGaleria', val)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🖼️ Galería / Cartelería Digital</Text>
                    <SwitchItem
                        label="Habilitar Galería"
                        value={localConfig.mostrarGaleria}
                        onValueChange={val => handleInputChange('mostrarGaleria', val)}
                    />
                    <InputItem
                        label="URL de Google Sheets (Galería)"
                        value={localConfig.urlGaleria || ''}
                        onChangeText={text => handleInputChange('urlGaleria', text)}
                        placeholder="URL del CSV de imágenes"
                        editable={localConfig.mostrarGaleria}
                    />
                    <InputItem
                        label="Tiempo por imagen (ms)"
                        value={String(localConfig.galeriaIntervalo || 7000)}
                        onChangeText={text => handleInputChange('galeriaIntervalo', text)}
                        keyboardType="numeric"
                        editable={localConfig.mostrarGaleria}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📰 Noticias RSS</Text>
                    <SwitchItem
                        label="Habilitar Feed RSS"
                        value={localConfig.rssEnabled}
                        onValueChange={val => handleInputChange('rssEnabled', val)}
                    />
                    <InputItem
                        label="URL del Feed RSS"
                        value={localConfig.urlRss || ''}
                        onChangeText={text => handleInputChange('urlRss', text)}
                        placeholder="https://e00-elmundo.uecdn.es/elmundo/rss/andalucia.xml"
                        editable={localConfig.rssEnabled}
                    />
                    <InputItem
                        label="Título de la Pantalla RSS"
                        value={localConfig.tituloRss || ''}
                        onChangeText={text => handleInputChange('tituloRss', text)}
                        placeholder="Noticias El Mundo Andalucía"
                        editable={localConfig.rssEnabled}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⛅ El Tiempo</Text>
                    <SwitchItem
                        label="Mostrar Pantalla del Tiempo"
                        value={localConfig.weatherEnabled}
                        onValueChange={val => handleInputChange('weatherEnabled', val)}
                    />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <InputItem
                                label="Latitud"
                                value={localConfig.weatherLat || ''}
                                onChangeText={text => handleInputChange('weatherLat', text)}
                                placeholder="36.52"
                                keyboardType="numeric"
                                editable={localConfig.weatherEnabled}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <InputItem
                                label="Longitud"
                                value={localConfig.weatherLon || ''}
                                onChangeText={text => handleInputChange('weatherLon', text)}
                                placeholder="-6.28"
                                keyboardType="numeric"
                                editable={localConfig.weatherEnabled}
                            />
                        </View>
                    </View>
                    <InputItem
                        label="Nombre de la Ciudad (Título)"
                        value={localConfig.weatherCity || ''}
                        onChangeText={text => handleInputChange('weatherCity', text)}
                        placeholder="Cádiz"
                        editable={localConfig.weatherEnabled}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🌐 Páginas Web Externas</Text>

                    <Text style={styles.subSectionTitle}>Página Web 1</Text>
                    <SwitchItem
                        label="Habilitar Página Web 1"
                        value={localConfig.web1Enabled}
                        onValueChange={val => handleInputChange('web1Enabled', val)}
                    />
                    <InputItem
                        label="URL Página Web 1"
                        value={localConfig.urlWeb1 || ''}
                        onChangeText={text => handleInputChange('urlWeb1', text)}
                        placeholder="https://ejemplo.com"
                        editable={localConfig.web1Enabled}
                    />
                    <InputItem
                        label="Título Página Web 1"
                        value={localConfig.tituloWeb1 || ''}
                        onChangeText={text => handleInputChange('tituloWeb1', text)}
                        placeholder="Mi Página Favorita"
                        editable={localConfig.web1Enabled}
                    />

                    <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>Página Web 2</Text>
                    <SwitchItem
                        label="Habilitar Página Web 2"
                        value={localConfig.web2Enabled}
                        onValueChange={val => handleInputChange('web2Enabled', val)}
                    />
                    <InputItem
                        label="URL Página Web 2"
                        value={localConfig.urlWeb2 || ''}
                        onChangeText={text => handleInputChange('urlWeb2', text)}
                        placeholder="https://ejemplo.com"
                        editable={localConfig.web2Enabled}
                    />
                    <InputItem
                        label="Título Página Web 2"
                        value={localConfig.tituloWeb2 || ''}
                        onChangeText={text => handleInputChange('tituloWeb2', text)}
                        placeholder="Página Web 2"
                        editable={localConfig.web2Enabled}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔒 Seguridad</Text>
                    <InputItem
                        label="Cambiar PIN de Administrador (Dejar vacío para mantener el actual)"
                        value={newPin}
                        onChangeText={setNewPin}
                        placeholder="Nuevo PIN"
                        keyboardType="numeric"
                        secureTextEntry={true}
                    />
                </View>

                <View style={styles.buttonContainer}>
                    {/* ✅ NUEVO: Botón para restaurar configuración */}
                    <TVButton
                        title="Restaurar Valores por Defecto"
                        onPress={handleRestoreDefaults}
                        onFocus={playNavSound}
                        style={{ backgroundColor: '#64748b', marginBottom: 20 }}
                    />

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#3b82f6" />
                    ) : (
                        // ✅ MEJORA TV: Usar botón personalizado con estados de foco
                        <TVButton
                            title="Guardar y Empezar"
                            onPress={handleSaveAndStart}
                            onFocus={playNavSound}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

// Componentes auxiliares para no repetir código
const InputItem = ({ label, editable = true, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    !editable && styles.inputDisabled,
                    isFocused && styles.inputFocused
                ]}
                placeholderTextColor="#666"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
                editable={editable}
            />
        </View>
    );
};

const SwitchItem = ({ label, ...props }) => (
    <View style={styles.switchContainer}>
        <Text style={styles.label}>{label}</Text>
        <Switch {...props} />
    </View>
);

// Componente de ejemplo para un botón navegable en TV
const TVButton = ({ title, onPress, style, onFocus }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            onFocus={() => {
                setIsFocused(true);
                if (onFocus) onFocus();
            }}
            onBlur={() => setIsFocused(false)}
            style={[
                styles.buttonBase,
                style, // ✅ Permitir sobreescribir estilos (color)
                isFocused && styles.buttonFocused // Estilo cuando tiene el foco
            ]}
            focusable={true} // ¡Muy importante!
        >
            <Text style={styles.buttonText}>{title}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 30,
    },
    statusContainer: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    statusText: {
        color: '#4ade80',
        fontWeight: '600',
        fontSize: 18,
    },
    section: {
        backgroundColor: '#1e293b',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        paddingBottom: 10,
    },
    subSectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginBottom: 10,
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 22,
        color: '#94a3b8',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#334155',
        color: 'white',
        borderRadius: 5,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 22,
        borderWidth: 2,
        borderColor: 'transparent',
        elevation: 2,
    },
    inputDisabled: {
        opacity: 0.5,
    },
    inputFocused: {
        borderColor: '#3b82f6',
        backgroundColor: '#0f172a',
        transform: [{ scale: 1.02 }], // Pequeño zoom al enfocar
        boxShadow: '0px 0px 10px #3b82f6',
        elevation: 10,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonContainer: {
        marginTop: 20,
        marginBottom: 40,
        minHeight: 40,
    },
    // Estilos para el botón de TV de ejemplo
    buttonBase: {
        padding: 15,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
    },
    buttonFocused: {
        transform: [{ scale: 1.05 }], // Agrandar el botón
        backgroundColor: '#2563eb', // Azul más brillante
        borderWidth: 2,
        borderColor: 'white',
        elevation: 15, // Sombra fuerte en Android
        boxShadow: '0px 0px 15px #2563eb', // Sombra para Web
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 24,
    },
});

export default ConfigScreen;