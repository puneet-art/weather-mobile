/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  ImageBackground,
  Animated,
  Dimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import ky from 'ky';

// Change this based on your device/emulator
const API_URL: string = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const { width } = Dimensions.get('window');

interface WeatherData {
  city: string;
  temperature: number;
  condition?: string; // 'sunny', 'rainy', 'cloudy', 'clear', etc.
  description?: string;
  humidity?: number;
  windSpeed?: number;
}

interface ForecastItem {
  date: string;
  temperature: number;
}

interface SearchResult {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  rating?: string;
  tag: string;
  image: string;
  type: string;
}

type Tab = 'Weather' | 'Search' | 'Films' | 'Profile';

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
      {/* Outer Glow */}
      <Animated.View style={{
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 180, 0, 0.1)',
        transform: [{ scale: pulse }]
      }} />

      {/* Sun Icon */}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Ionicons name="sunny" size={100} color="#FFD700" />
      </Animated.View>

      {/* Rotating Rays */}
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

const App: React.FC = () => {
  const [city, setCity] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('Search');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchSearchResults = async (queryOverride?: string) => {
    setSearchLoading(true);
    try {
      const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim() || '';
      const endpoint = filterType === 'Actors' ? 'actors' : 'films';
      const response: any[] = await ky.get(`${API_URL}/search/${endpoint}`, { searchParams: { q } }).json();

      const filmImages = [
        'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&q=80&w=600',
      ];
      const actorImages = [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      ];
      const genres = ['Drama', 'Comedy', 'Musical', 'Documentary', 'Action', 'Thriller'];

      const mapped = response.map((item, i) => {
        if (endpoint === 'films') {
          return {
            id: item.filmId,
            title: item.title,
            subtitle: item.releaseYear?.toString() || '2023',
            description: item.description || 'A thrilling adventure through the world of cinema.',
            rating: (Math.random() * 2 + 7.1).toFixed(1),
            tag: genres[item.filmId % genres.length],
            image: filmImages[item.filmId % filmImages.length],
            type: 'Film'
          };
        } else {
          return {
            id: item.actorId,
            title: `${item.firstName} ${item.lastName}`,
            subtitle: 'Actor',
            description: `A celebrated actor known for amazing performances.`,
            tag: 'Celebrity',
            image: actorImages[item.actorId % actorImages.length],
            type: 'Actor'
          };
        }
      });
      setSearchResults(mapped);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch search results.');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Search') {
      fetchSearchResults();
    }
  }, [activeTab]);


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
    fadeAnim.setValue(0);

    try {
      const [weatherData, forecastData] = await Promise.all([
        ky.get(`${API_URL}/weather/current`, { searchParams: { city } }).json<WeatherData>(),
        ky.get(`${API_URL}/weather/forecast`, { searchParams: { city } }).json<{ forecast: ForecastItem[] }>()
      ]);

      // Normalize condition for mapping
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
    <SafeAreaView style={[styles.container, darkMode ? styles.darkBg : styles.lightBg]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, darkMode ? styles.whiteText : styles.darkText]}>Weather</Text>
          <Text style={[styles.headerSubtitle, darkMode ? styles.greyText : styles.lightGreyText]}>Get current weather & forecast</Text>
        </View>
        <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={styles.themeToggle}>
          <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={24} color={darkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'Weather' ? (
          <>
            {/* Main Weather Card */}
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
                  </View>
                </ImageBackground>
              )}
            </Animated.View>

            {/* Input Section */}
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

            {/* Status/Placeholder Area */}
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

            {/* Forecast Section */}
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
          </>
        ) : activeTab === 'Search' ? (
          <View style={styles.searchContainer}>
            {/* Header */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.headerTitle, darkMode ? styles.whiteText : styles.darkText]}>Films</Text>
              <Text style={[styles.headerSubtitle, darkMode ? styles.greyText : styles.lightGreyText]}>Browse our collection</Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={20} color={darkMode ? '#888' : '#aaa'} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, darkMode ? styles.darkInput : styles.lightInput, { flex: 1 }]}
                placeholder="Search films or actors..."
                placeholderTextColor={darkMode ? '#888' : '#aaa'}
                value={searchQuery}
                onChangeText={text => {
                  setSearchQuery(text);
                }}
                onSubmitEditing={() => fetchSearchResults()}
                returnKeyType="search"
              />
            </View>

            {/* Filters */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="funnel-outline" size={20} color="#f0a040" style={{ marginRight: 15 }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['All', 'Drama', 'Comedy', 'Musical', 'Documentary', 'Actors'].map(filter => {
                  const isActive = filterType === filter || (filter === 'All' && filterType === 'Films');
                  return (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterBadge,
                        isActive ? styles.filterBadgeActive : (darkMode ? styles.filterBadgeDark : styles.filterBadgeLight)
                      ]}
                      onPress={() => {
                        const newFilter = filter === 'Actors' ? 'Actors' : (filter === 'All' ? 'Films' : filter);
                        setFilterType(newFilter);
                        // trigger search with new filter immediately
                        // In reality, if it's "Drama", we'd maybe fetch films + search by description.
                        // Here we just re-fetch to show something
                        setTimeout(fetchSearchResults, 100);
                      }}
                    >
                      <Text style={[
                        styles.filterText,
                        isActive ? styles.filterTextActive : (darkMode ? styles.whiteText : styles.darkText)
                      ]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <Text style={[styles.resultsCount, darkMode ? styles.greyText : styles.lightGreyText]}>
              {searchResults.length} {filterType === 'Actors' ? 'actors' : 'films'} found
            </Text>

            {searchLoading ? (
              <ActivityIndicator size="large" color="#f0a040" style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.gridContainer}>
                {searchResults.map((item) => (
                  <View key={`${item.type}-${item.id}`} style={[styles.gridCard, darkMode ? styles.darkCard : styles.lightCard]}>
                    <ImageBackground source={{ uri: item.image }} style={styles.cardImageBackground} imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                      {item.rating && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={12} color="#fff" />
                          <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                      )}
                    </ImageBackground>
                    <View style={styles.cardContent}>
                      <Text style={[styles.cardTitle, darkMode ? styles.whiteText : styles.darkText]} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.cardMetaRow}>
                        <Ionicons name="calendar-outline" size={12} color="#888" />
                        <Text style={styles.cardMetaText}>{item.subtitle}  •  </Text>
                        <Text style={styles.cardTagText}>{item.tag}</Text>
                      </View>
                      <Text style={[styles.cardDescription, darkMode ? styles.greyText : styles.lightGreyText]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.comingSoonContainer}>
            <Ionicons
              name={
                activeTab === 'Films' ? 'film-outline' : 'person-outline'
              }
              size={100}
              color={darkMode ? '#444' : '#ccc'}
            />
            <Text style={[styles.comingSoonTitle, darkMode ? styles.whiteText : styles.darkText]}>
              {activeTab} Feature
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>COMING SOON</Text>
            </View>
            <Text style={[styles.comingSoonSubtitle, darkMode ? styles.greyText : styles.lightGreyText]}>
              We are working hard to bring you the {activeTab.toLowerCase()} experience. Stay tuned!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, darkMode ? styles.darkNav : styles.lightNav]}>
        {(['Weather', 'Search', 'Films', 'Profile'] as Tab[]).map((tab) => {
          const icons: Record<Tab, keyof typeof Ionicons.glyphMap> = {
            Weather: 'cloud-outline',
            Search: 'search-outline',
            Films: 'film-outline',
            Profile: 'person-outline',
          };
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.navItem}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={icons[tab]}
                size={24}
                color={isActive ? '#f0a040' : (darkMode ? '#666' : '#999')}
              />
              <Text style={[styles.navLabel, { color: isActive ? '#f0a040' : (darkMode ? '#666' : '#999') }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkBg: {
    backgroundColor: '#121b2b',
  },
  lightBg: {
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
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
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
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
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
  },
  darkNav: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  lightNav: {
    backgroundColor: '#fff',
    borderTopColor: '#f1f5f9',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  comingSoonTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 22,
  },
  badge: {
    backgroundColor: 'rgba(240, 160, 64, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0a040',
    marginTop: 20,
  },
  badgeText: {
    color: '#f0a040',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  searchContainer: {
    paddingTop: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    paddingLeft: 45,
    paddingRight: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  filterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  filterBadgeActive: {
    backgroundColor: '#f0a040',
    borderColor: '#f0a040',
  },
  filterBadgeDark: {
    backgroundColor: '#1c2635',
    borderColor: '#2d3748',
  },
  filterBadgeLight: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  gridCard: {
    width: (width - 60) / 2, // 2 columns with gaps
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  darkCard: {
    backgroundColor: '#1c2635',
    borderColor: '#2d3748',
  },
  lightCard: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  cardImageBackground: {
    width: '100%',
    height: 140,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0a040',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  cardMetaText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  cardTagText: {
    fontSize: 12,
    color: '#f0a040',
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default App;

