// App.js
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AnimatedBackground from './components/AnimatedBackground';
import AnimatedBackgroundTV from './components/AnimatedBackgroundTV';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalAlert from './components/GlobalAlert';
import ProximoTimbre from './components/ProximoTimbre';
import Reloj from './components/Reloj';
import { AppProvider, useAppContext } from './context/AppContext';
import AppNavigator from './Navigation/AppNavigator';
import { suppressKnownWarnings } from './utils/suppressWarnings';

// Suprimir warnings conocidos en web
suppressKnownWarnings();

const AppContainer = Platform.isTV ? View : SafeAreaView;

// Detectar si es Android TV
const isAndroidTV = Platform.OS === 'android' && Platform.isTV;

const StatusIndicator = React.memo(() => {
    const { lastUpdateSuccess, isLoading } = useAppContext();
    const [statusColor, setStatusColor] = useState('#ef4444'); // Rojo por defecto (sin datos)

    useEffect(() => {
        if (!lastUpdateSuccess) {
            setStatusColor('#ef4444'); // Rojo
            return;
        }

        const checkStatus = () => {
            const now = new Date();
            const diffMinutes = (now - new Date(lastUpdateSuccess)) / 1000 / 60;

            if (diffMinutes < 5) {
                setStatusColor('#22c55e'); // Verde (Reciente)
            } else if (diffMinutes < 30) {
                setStatusColor('#eab308'); // Amarillo (Hace un rato)
            } else {
                setStatusColor('#ef4444'); // Rojo (Desactualizado)
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 60000); // Revisar cada minuto
        return () => clearInterval(interval);
    }, [lastUpdateSuccess]);

    return (
        <View style={styles.statusContainer}>
            {isLoading && <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />}
            <Ionicons name="cloud-done" size={24} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
                {lastUpdateSuccess ? new Date(lastUpdateSuccess).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sin datos'}
            </Text>
        </View>
    );
});

const AppContent = () => {
    useKeepAwake(); // 💡 Mantiene la pantalla encendida siempre (Modo Kiosco)
    const { activeAlert, theme } = useAppContext();

    // Seleccionar el fondo apropiado según la plataforma
    const BackgroundComponent = useMemo(() => {
        return isAndroidTV ? AnimatedBackgroundTV : AnimatedBackground;
    }, []);

    return (
        <AppContainer style={{ flex: 1 }}>
            <BackgroundComponent />
            <View style={styles.header}>
                <Image
                    source={require('./assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                {/* Nuevo Indicador de Estado */}
                <StatusIndicator />

                {/* 🔔 WIDGET PRÓXIMO TIMBRE */}
                <ProximoTimbre />

                <Reloj />
            </View>
            <GlobalAlert alert={activeAlert} />
            <View style={{ flex: 1 }}>
                <NavigationContainer>
                    <AppNavigator />
                </NavigationContainer>
            </View>
        </AppContainer >
    );
};

export default function App() {
    return (
        <AppProvider>
            <SafeAreaProvider>
                <ErrorBoundary>
                    <AppContent />
                </ErrorBoundary>
            </SafeAreaProvider>
        </AppProvider>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 6,
        zIndex: 10,
    },
    logo: {
        width: 180,
        height: 65,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.3)',
    },
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
});
