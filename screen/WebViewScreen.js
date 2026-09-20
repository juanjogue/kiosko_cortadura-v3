// screens/WebViewScreen.js
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

// Carga condicional para evitar errores en Web si la librería no tiene soporte perfecto
let WebView;
if (Platform.OS !== 'web') {
    WebView = require('react-native-webview').WebView;
}

const WebViewScreen = ({ route }) => {
    // Pasa la URL y el título como parámetros de navegación
    const { url, title } = route.params || {};

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {Platform.OS === 'web' ? (
                <iframe 
                    src={url} 
                    style={{ width: '100%', border: 'none', flex: 1 }} 
                    title={title} 
                />
            ) : (
                <WebView source={{ uri: url }} style={styles.webview} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    title: { color: 'white', fontSize: 20, padding: 15 },
    webview: { flex: 1 }
});

export default WebViewScreen;
