// screens/RssScreen.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import GlassCard from '../components/GlassCard';
import { AUTO_SCROLL_SETTINGS } from '../constants/appConstants';
import { useAppContext } from '../context/AppContext';
import { useAutoScroll } from '../hooks/useAutoScroll';

const RssScreen = ({ route }) => {
    // Obtenemos los parámetros de la navegación (url y título)
    const { url, title } = route.params || {};
    const { theme, isDark } = useAppContext();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ USAMOS EL HOOK CENTRALIZADO CON VELOCIDAD REDUCIDA
    const { flatListRef, onContentSizeChange, onLayout } = useAutoScroll(news, AUTO_SCROLL_SETTINGS.RSS_SPEED, 3000);

    useEffect(() => {
        if (!url) {
            setError("No se ha configurado una URL para el RSS.");
            setLoading(false);
            return;
        }

        const fetchRss = async () => {
            try {
                // Usamos rss2json para convertir RSS a JSON fácilmente sin librerías XML pesadas
                const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
                const data = await response.json();

                if (data.status === 'ok') {
                    setNews(data.items);
                } else {
                    throw new Error("No se pudo parsear el feed RSS.");
                }
            } catch (err) {
                console.error("Error fetching RSS:", err);
                setError("Error al cargar las noticias. Verifica tu conexión o la URL.");
            } finally {
                setLoading(false);
            }
        };

        fetchRss();
    }, [url]);

    const renderItem = ({ item }) => {
        // Limpiamos etiquetas HTML básicas de la descripción si las hay
        const description = item.description
            ? item.description.replace(/<[^>]*>/g, '').trim()
            : '';

        return (
            <GlassCard style={styles.card} intensity={25} onPress={() => { }}>
                <View style={styles.cardContent}>
                    {item.thumbnail && (
                        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
                    )}
                    <View style={styles.textContainer}>
                        <Text style={[styles.newsTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text style={[styles.newsDate, { color: theme.textSecondary }]}>{item.pubDate}</Text>
                        {description ? (
                            <Text style={[styles.newsDescription, { color: theme.textSecondary }]} numberOfLines={4}>
                                {description}
                            </Text>
                        ) : null}
                    </View>

                    {/* Código QR para leer la noticia completa */}
                    {item.link && (
                        <View style={[styles.qrContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderLeftColor: theme.border }]}>
                            <View style={styles.qrBackground}>
                                <QRCode value={item.link} size={80} />
                            </View>
                            <Text style={styles.qrText}>Leer en móvil</Text>
                        </View>
                    )}
                </View>
            </GlassCard>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Cargando noticias...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.screenTitle, { color: theme.text, borderBottomColor: theme.border }]}>{title || 'Noticias'}</Text>
            <FlatList
                ref={flatListRef}
                data={news}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.guid || index.toString()}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={onContentSizeChange}
                onLayout={onLayout}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        borderBottomWidth: 1,
        paddingBottom: 10,
    },
    loadingText: {
        color: '#94a3b8',
        marginTop: 10,
        fontSize: 18,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 20,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 40,
    },
    card: {
        marginBottom: 16,
        padding: 0,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center', // Alineación vertical centrada
        flex: 1,
    },
    thumbnail: {
        width: 120,
        height: '100%',
        backgroundColor: '#334155',
    },
    textContainer: {
        flex: 1,
        padding: 16,
    },
    newsTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    newsDate: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 10,
        fontStyle: 'italic',
    },
    newsDescription: {
        fontSize: 16,
        lineHeight: 24,
    },
    // Estilos para el contenedor del QR
    qrContainer: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        width: 110,
    },
    qrBackground: {
        padding: 4,
        backgroundColor: 'white',
        borderRadius: 4,
    },
    qrText: {
        color: '#94a3b8',
        fontSize: 10,
        marginTop: 4,
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

export default RssScreen;
