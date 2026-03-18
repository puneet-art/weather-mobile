import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    ImageBackground,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ky from 'ky';
import { API_URL, WeatherData, ForecastItem } from './types';

const { width } = Dimensions.get('window');

const WEATHER_IMAGES: Record<string, string> = {
    sunny: 'https://images.unsplash.com/photo-1506452819137-0422416856b8?auto=format&fit=crop&q=80&w=1000',
    rainy: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=1000',
    cloudy: 'https://images.unsplash.com/photo-1534088568595-a066f710b721?auto=format&fit=crop&q=80&w=1000',
    clear: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000',
    default: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000',
};

const WEATHER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    sunny: 'sunny-outline',
    rainy: 'rainy-outline',
    cloudy: 'cloud-outline',
    clear: 'moon-outline',
    default: 'cloud-outline',
};

const RainDrop = ({ left, delay, duration }: { left: string; delay: number; duration: number }) => {
    const fall = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(fall, {
                    toValue: 220,
                    duration: duration,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: left as any,
                top: 0,
                width: 2,
                height: 10,
                backgroundColor: 'rgba(255,255,255,0.4)',
                transform: [{ translateY: fall }],
            }}
        />
    );
};

const Raindrops = () => {
    const drops = Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 2000,
        duration: 1000 + Math.random() * 1000,
    }));

    return (
        <View style={StyleSheet.absoluteFill}>
            {drops.map((drop) => (
                <RainDrop key={drop.id} left={drop.left} delay={drop.delay} duration={drop.duration} />
            ))}
        </View>
    );
};

const SunRays = () => {
    const rotate = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotate, {
                toValue: 1,
                duration: 15000,
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.2, duration: 2000, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const spin = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
            <Animated.View style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: 'rgba(255, 180, 0, 0.1)',
                transform: [{ scale: pulse }]
            }} />
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <Ionicons name="sunny" size={100} color="#FFD700" />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', transform: [{ rotate: spin }] }}>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <View
                        key={deg}
                        style={{
                            position: 'absolute',
                            width: 3,
                            height: 220,
                            backgroundColor: 'rgba(255, 215, 0, 0.2)',
                            borderRadius: 2,
                            transform: [{ rotate: `${deg}deg` }],
                        }}
                    />
                ))}
            </Animated.View>
        </View>
    );
};

const FloatingClouds = () => {
    const cloud1 = useRef(new Animated.Value(-100)).current;
    const cloud2 = useRef(new Animated.Value(-150)).current;

    useEffect(() => {
        const animateCloud = (anim: Animated.Value, duration: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: width,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: -150,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animateCloud(cloud1, 15000);
        animateCloud(cloud2, 22000);
    }, []);

    return (
        <View style={StyleSheet.absoluteFill}>
            <Animated.View style={{ position: 'absolute', top: 30, transform: [{ translateX: cloud1 }] }}>
                <Ionicons name="cloud" size={100} color="rgba(255,255,255,0.15)" />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', top: 100, transform: [{ translateX: cloud2 }] }}>
                <Ionicons name="cloud" size={120} color="rgba(255,255,255,0.1)" />
            </Animated.View>
        </View>
    );
};

interface WeatherViewProps {
    darkMode: boolean;
}

const WeatherView: React.FC<WeatherViewProps> = ({ darkMode }) => {
    const [city, setCity] = useState<string>('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [forecast, setForecast] = useState<ForecastItem[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchTime, setSearchTime] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const fetchWeather = async () => {
        if (!city.trim()) {
            Alert.alert('Error', 'Please enter a city name');
            return;
        }

        setLoading(true);
        setSearchTime(null);
        fadeAnim.setValue(0);

        try {
            const [weatherRes, forecastRes] = await Promise.all([
                ky.get(`${API_URL}/weather/current/${encodeURIComponent(city)}`),
                ky.get(`${API_URL}/weather/forecast/${encodeURIComponent(city)}`)
            ]);

            // Extract timing from Server-Timing header (take from first response)
            const serverTiming = weatherRes.headers.get('Server-Timing');
            if (serverTiming) {
                const match = serverTiming.match(/dur=([\d.]+)/);
                if (match) {
                    setSearchTime(match[1]);
                }
            }

            const weatherData = await weatherRes.json<WeatherData>();
            const forecastData = await forecastRes.json<{ forecast: ForecastItem[] }>();

            const condition = (weatherData.description || 'clear').toLowerCase();
            let normalizedCondition = 'default';
            if (condition.includes('sun')) normalizedCondition = 'sunny';
            else if (condition.includes('rain')) normalizedCondition = 'rainy';
            else if (condition.includes('cloud')) normalizedCondition = 'cloudy';
            else if (condition.includes('clear')) normalizedCondition = 'clear';

            setWeather({ ...weatherData, condition: normalizedCondition });
            setForecast(forecastData.forecast);

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch weather data. Please check the city name or server connection.');
        } finally {
            setLoading(false);
        }
    };

    const currentBg = weather?.condition ? WEATHER_IMAGES[weather.condition] : WEATHER_IMAGES.default;
    const currentIcon = weather?.condition ? WEATHER_ICONS[weather.condition] : WEATHER_ICONS.default;

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={{
                opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
            }}>
                {weather && (
                    <ImageBackground
                        source={{ uri: currentBg }}
                        style={styles.mainCard}
                        imageStyle={styles.cardImage}
                    >
                        <View style={styles.cardOverlay}>
                            {weather?.condition === 'rainy' && <Raindrops />}
                            {weather?.condition === 'sunny' && <SunRays />}
                            {weather?.condition === 'cloudy' && <FloatingClouds />}

                            <View style={styles.cardHeader}>
                                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                    <Ionicons name={currentIcon} size={64} color="#fff" />
                                </Animated.View>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.cardCity}>{weather.city.toUpperCase()}</Text>
                                    <Text style={styles.cardDesc}>{weather.description}</Text>
                                </View>
                            </View>

                            <Text style={styles.cardText}>{`${Math.round(weather.temperature)}°C`}</Text>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Ionicons name="water-outline" size={16} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.statText}>{weather.humidity}%</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Ionicons name="speedometer-outline" size={16} color="rgba(255,255,255,0.8)" />
                                    <Text style={styles.statText}>{weather.windSpeed} km/h</Text>
                                </View>
                            </View>

                            {searchTime && (
                                <View style={styles.timingBadge}>
                                    <Ionicons name="flash" size={10} color="#fff" />
                                    <Text style={styles.timingText}>Server Response: {searchTime}ms</Text>
                                </View>
                            )}
                        </View>
                    </ImageBackground>
                )}
            </Animated.View>

            <View style={styles.inputSection}>
                <TextInput
                    style={[styles.input, darkMode ? styles.darkInput : styles.lightInput]}
                    placeholder="Enter city name..."
                    placeholderTextColor={darkMode ? '#888' : '#aaa'}
                    value={city}
                    onChangeText={setCity}
                    onSubmitEditing={fetchWeather}
                />
                <TouchableOpacity style={styles.button} onPress={fetchWeather} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Get Weather</Text>
                </TouchableOpacity>
            </View>

            {!weather && !loading && (
                <View style={styles.placeholderContainer}>
                    <Ionicons name="cloud-outline" size={80} color={darkMode ? '#444' : '#ccc'} />
                    <Text style={[styles.placeholderTitle, darkMode ? styles.whiteText : styles.darkText]}>Check Weather</Text>
                    <Text style={[styles.placeholderSubtitle, darkMode ? styles.greyText : styles.lightGreyText]}>
                        Enter a city name above to get current weather and 5-day forecast
                    </Text>
                </View>
            )}

            {loading && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#f0a040" />
                </View>
            )}

            {weather && forecast && (
                <View style={styles.forecastContainer}>
                    <Text style={[styles.sectionTitle, darkMode ? styles.whiteText : styles.darkText]}>5-Day Forecast</Text>
                    {forecast.map((item, index) => (
                        <View key={index} style={[styles.forecastItem, darkMode ? styles.darkItem : styles.lightItem]}>
                            <Text style={[styles.forecastDate, darkMode ? styles.whiteText : styles.darkText]}>
                                {new Date(item.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </Text>
                            <View style={styles.forecastRight}>
                                <Ionicons name="thermometer-outline" size={18} color="#f0a040" />
                                <Text style={[styles.forecastTemp, darkMode ? styles.whiteText : styles.darkText]}>
                                    {Math.round(item.temperature)}°C
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    mainCard: {
        width: '100%',
        height: 220,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    cardImage: {
        borderRadius: 24,
    },
    cardOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 5,
    },
    headerInfo: {
        alignItems: 'flex-start',
    },
    cardText: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
        marginVertical: 5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 10,
    },
    cardCity: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    cardDesc: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        textTransform: 'capitalize',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 10,
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 15,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 15,
    },
    timingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 15,
        gap: 6,
    },
    timingText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    inputSection: {
        gap: 15,
        marginBottom: 40,
    },
    input: {
        height: 60,
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        borderWidth: 1,
    },
    darkInput: {
        backgroundColor: '#1c2635',
        borderColor: '#2d3748',
        color: '#fff',
    },
    lightInput: {
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        color: '#121b2b',
    },
    button: {
        backgroundColor: '#f0a040',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#f0a040',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholderContainer: {
        alignItems: 'center',
        marginTop: 40,
        paddingHorizontal: 40,
    },
    placeholderTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
    },
    placeholderSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
    whiteText: {
        color: '#fff',
    },
    darkText: {
        color: '#121b2b',
    },
    greyText: {
        color: '#8b95a5',
    },
    lightGreyText: {
        color: '#6c757d',
    },
    loaderContainer: {
        marginTop: 50,
    },
    forecastContainer: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    forecastItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        marginBottom: 12,
    },
    darkItem: {
        backgroundColor: '#1c2635',
    },
    lightItem: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
    },
    forecastDate: {
        fontSize: 16,
        fontWeight: '500',
    },
    forecastRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    forecastTemp: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default WeatherView;
