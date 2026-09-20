// screens/WeatherScreen.js
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import GlassCard from '../components/GlassCard';
import { useAppContext } from '../context/AppContext';

// Mapeo de códigos WMO de Open-Meteo a Iconos y Descripciones
const getWeatherInfo = (code) => {
    switch (code) {
        case 0: return { icon: 'weather-sunny', label: 'Despejado', color: '#fbbf24' };
        case 1:
        case 2:
        case 3: return { icon: 'weather-partly-cloudy', label: 'Parcialmente Nublado', color: '#94a3b8' };
        case 45:
        case 48: return { icon: 'weather-fog', label: 'Niebla', color: '#64748b' };
        case 51:
        case 53:
        case 55: return { icon: 'weather-rainy', label: 'Llovizna', color: '#60a5fa' };
        case 61:
        case 63:
        case 65: return { icon: 'weather-pouring', label: 'Lluvia', color: '#3b82f6' };
        case 71:
        case 73:
        case 75: return { icon: 'weather-snowy', label: 'Nieve', color: '#e2e8f0' };
        case 80:
        case 81:
        case 82: return { icon: 'weather-pouring', label: 'Lluvia Intensa', color: '#1d4ed8' };
        case 95:
        case 96:
        case 99: return { icon: 'weather-lightning', label: 'Tormenta', color: '#f59e0b' };
        default: return { icon: 'weather-cloudy', label: 'Nublado', color: '#94a3b8' };
    }
};

const WeatherCard = ({ day, tempMax, tempMin, code, isToday = false }) => {
    const { theme, isDark } = useAppContext();
    const { icon, color } = getWeatherInfo(code);
    const dayName = new Date(day).toLocaleDateString('es-ES', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    return (
        <GlassCard
            style={[styles.forecastCard, isToday && styles.forecastCardToday]}
            intensity={25}
            onPress={() => { }} // Focusable
        >
            <Text style={[styles.forecastDay, { color: theme.textSecondary }, isToday && { fontWeight: 'bold', color: theme.text }]}>
                {isToday ? 'Hoy' : capitalizedDay}
            </Text>
            <MaterialCommunityIcons name={icon} size={isToday ? 50 : 40} color={color} />
            <View style={styles.forecastTempContainer}>
                <Text style={[styles.forecastTempMax, { color: theme.text }]}>{Math.round(tempMax)}°</Text>
                <Text style={[styles.forecastTempMin, { color: theme.textSecondary }]}>{Math.round(tempMin)}°</Text>
            </View>
        </GlassCard>
    );
};

const WeatherScreen = ({ route }) => {
    const { lat, lon, city } = route.params || {};
    const { theme, isDark } = useAppContext();
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!lat || !lon) {
            setError("Coordenadas no configuradas.");
            setLoading(false);
            return;
        }

        const fetchWeather = async () => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_mean&timezone=auto`;
                console.log('Fetching weather:', url);

                const response = await fetch(url);
                const data = await response.json();

                if (!data.current || !data.daily) {
                    throw new Error("Datos incompletos de la API.");
                }

                setWeather(data);
            } catch (err) {
                console.error("Error fetching weather:", err);
                setError("No se pudo cargar el tiempo.");
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [lat, lon]);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fbbf24" />
                <Text style={styles.loadingText}>Consultando satélites...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <MaterialCommunityIcons name="weather-cloudy-alert" size={60} color="#ef4444" />
                <Text style={[styles.errorText, { color: theme.text }]}>⚠️ {error}</Text>
            </View>
        );
    }

    // Datos actuales
    const current = weather.current;
    // ✅ FIX: Fallback seguro si el código no se reconoce
    const currentInfo = getWeatherInfo(current.weather_code) || { icon: 'weather-cloudy', label: 'Desconocido', color: '#94a3b8' };

    // ✅ NUEVO: Probabilidad de lluvia de HOY (índice 0)
    const todayRainProb = weather.daily.precipitation_probability_mean ? weather.daily.precipitation_probability_mean[0] : 0;

    // Gradiente de fondo según el clima
    // Si es de noche o llueve, más oscuro; si es soleado, más azul/naranja.
    // Por simplicidad usaremos un gradiente azul oscuro elegante siempre.

    return (
        <LinearGradient
            colors={isDark ? ['rgba(30, 58, 138, 0.7)', 'rgba(15, 23, 42, 0.8)'] : ['rgba(191, 219, 254, 0.7)', 'rgba(248, 250, 252, 0.8)']}
            style={styles.container}
        >
            <Text style={[styles.cityTitle, { color: theme.text }]}>📍 {city || 'Ubicación Desconocida'}</Text>

            {/* SECCIÓN PRINCIPAL */}
            <View style={styles.mainSection}>
                <View style={styles.iconContainer}>
                    {/* Disminuido tamaño de icono de 140 a 110 */}
                    <MaterialCommunityIcons name={currentInfo.icon} size={110} color={currentInfo.color} />
                    <Text style={[styles.weatherDescription, { color: currentInfo.color }]}>
                        {currentInfo.label}
                    </Text>
                </View>

                <View style={styles.tempContainer}>
                    <Text style={[styles.mainTemp, { color: theme.text }]}>{Math.round(current.temperature_2m)}°</Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statRow}>
                            <MaterialCommunityIcons name="water-percent" size={30} color="#60a5fa" />
                            <Text style={[styles.statText, { color: theme.textSecondary }]}>{current.relative_humidity_2m}% Humedad</Text>
                        </View>
                        <View style={styles.statRow}>
                            <MaterialCommunityIcons name="weather-windy" size={30} color={theme.textSecondary} />
                            <Text style={[styles.statText, { color: theme.textSecondary }]}>{current.wind_speed_10m} km/h Viento</Text>
                        </View>
                        {/* ✅ NUEVO: Probabilidad de Lluvia */}
                        <View style={styles.statRow}>
                            <MaterialCommunityIcons name="umbrella" size={30} color="#3b82f6" />
                            <Text style={[styles.statText, { color: '#60a5fa', fontWeight: 'bold' }]}>
                                {todayRainProb}% Lluvia hoy
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* SECCIÓN PRONÓSTICO */}
            <Text style={[styles.forecastTitle, { color: theme.textSecondary }]}>📅 Próximos 3 Días</Text>
            <View style={styles.forecastContainer}>
                {weather.daily.time.slice(0, 3).map((day, index) => (
                    <WeatherCard
                        key={day}
                        day={day}
                        tempMax={weather.daily.temperature_2m_max[index]}
                        tempMin={weather.daily.temperature_2m_min[index]}
                        code={weather.daily.weather_code[index]}
                        isToday={index === 0}
                    />
                ))}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: { color: '#94a3b8', marginTop: 15, fontSize: 18 },
    errorText: { color: '#ef4444', fontSize: 20, marginTop: 15 },

    cityTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginTop: 10,
        ...Platform.select({
            web: {
                textShadow: '1px 1px 10px rgba(0,0,0,0.5)',
            },
            default: {
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 10,
            }
        }),
    },
    mainSection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        alignItems: 'center',
    },
    weatherDescription: {
        fontSize: 32, // Aumentado de 28
        fontWeight: '600',
        marginTop: 10,
        textTransform: 'capitalize',
    },
    tempContainer: {
        alignItems: 'center',
    },
    mainTemp: {
        fontSize: 160, // Aumentado de 120
        fontWeight: 'bold',
        color: 'white',
        includeFontPadding: false,
    },
    statsContainer: {
        marginTop: 0,
        gap: 12, // Aumentado gap
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statText: {
        color: '#cbd5e1',
        fontSize: 24, // Aumentado de 18
    },
    forecastTitle: {
        color: '#94a3b8',
        fontSize: 22, // Aumentado de 18
        marginBottom: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    forecastContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 15,
    },
    forecastCard: {
        flex: 1,
        // backgroundColor: handled by GlassCard
        borderRadius: 15,
        padding: 15,
        alignItems: 'center',
        // border handled by GlassCard default or override
    },
    forecastCardToday: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: '#fbbf24',
        borderWidth: 2,
    },
    forecastDay: {
        color: '#cbd5e1',
        fontSize: 20, // Aumentado de 18
        marginBottom: 10,
    },
    forecastTempContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 10,
        gap: 8,
    },
    forecastTempMax: {
        fontSize: 32, // Aumentado de 24
        fontWeight: 'bold',
        color: 'white',
    },
    forecastTempMin: {
        fontSize: 24, // Aumentado de 18
        color: '#94a3b8',
    },
});

export default WeatherScreen;
