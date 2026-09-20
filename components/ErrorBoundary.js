// components/ErrorBoundary.js
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Para Expo gestionado, Updates.reloadAsync() es mejor
import * as Updates from 'expo-updates';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        // Aquí podrías enviar el error a un servicio de logging
    }

    handleReload = async () => {
        try {
            await Updates.reloadAsync();
        } catch (_e) {
            // Fallback para desarrollo o web si Updates no está disponible
            if (typeof window !== 'undefined') {
                window.location.reload();
            } else {
                console.error("No se pudo recargar la aplicación");
            }
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Ionicons name="warning" size={80} color="#fca5a5" />
                    <Text style={styles.title}>¡Vaya! Algo salió mal.</Text>
                    <Text style={styles.message}>
                        La aplicación ha encontrado un error inesperado.
                    </Text>
                    <Text style={styles.errorText}>
                        {this.state.error?.toString()}
                    </Text>

                    <TouchableOpacity style={styles.button} onPress={this.handleReload}>
                        <Text style={styles.buttonText}>🔄 Reiniciar Kiosco</Text>
                    </TouchableOpacity>

                    {/* Auto-reload visible countdown podría ser añadido aquí */}
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    message: {
        color: '#94a3b8',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginBottom: 40,
        fontFamily: 'monospace',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 10,
        borderRadius: 8,
    },
    button: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 12,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    }
});

export default ErrorBoundary;
