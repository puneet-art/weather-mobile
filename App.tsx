/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform, Image, FlatList } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
// Change this based on your device/emulator
// 10.0.2.2 for Android Emulator, localhost for iOS simulator/Web
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

interface WeatherData {
  city: string;
  temperature: number;
}

interface ForecastItem {
  date: string;
  temperature: number;
}

interface ForecastData {
  forecast: ForecastItem[];
}
type Tab = 'Home' | 'Explore' | 'Search';
export default function App() {
  const [city, setCity] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>('Home');


  const fetchWeather = async () => {
    if (!city.trim()) {
      Alert.alert('Error', 'Please enter a city name');
      return;
    }

    setLoading(true);
    setWeather(null);
    setForecast(null);

    try {
      // Parallel requests
      const [weatherRes, forecastRes] = await Promise.all([
        fetch(`${API_URL}/weather/current?city=${encodeURIComponent(city)}`),
        fetch(`${API_URL}/weather/forecast?city=${encodeURIComponent(city)}`)
      ]);
      if (!weatherRes.ok || !forecastRes.ok) {
        throw new Error('Request failed');
      }
      const weatherData: WeatherData = await weatherRes.json();
      const forecastData: ForecastData = await forecastRes.json();
      setWeather(weatherData);
      setForecast(forecastData);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch weather data. Please check the city name or server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>☁️ Weather App</Text>

        {activeTab === 'Home' && (
          <>
            <View style={styles.searchStack}>
              <TextInput
                style={styles.inputFull}
                placeholder="Enter city name"
                value={city}
                onChangeText={setCity}
                returnKeyType="search"
                onSubmitEditing={fetchWeather}
              />
              <TouchableOpacity style={styles.buttonFull} onPress={fetchWeather}>
                <Text style={styles.buttonText}>Get Weather</Text>
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

            <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
              {weather && (
                <View style={styles.weatherCard}>
                  <Text style={styles.cityName}>{(weather.city || '').toLowerCase()}</Text>
                  <Text style={styles.temperature}>{Math.round(weather.temperature)}°C</Text>
                </View>
              )}

              {forecast && (
                <View style={styles.forecastSection}>
                  {forecast.forecast.map((item, index) => (
                    <View key={index} style={styles.forecastItem}>
                      <Text style={styles.forecastDate}>{new Date(item.date).toISOString()}</Text>
                      <Text style={styles.forecastTemp}>{Math.round(item.temperature)}°C</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        )}

        {activeTab === 'Explore' && (
          <View style={{ flex: 1, backgroundColor: '#fff' }} />
        )}

        {activeTab === 'Search' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, color: '#555' }}>Search History</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Home' && styles.tabActive]}
          onPress={() => setActiveTab('Home')}
        >
          <Ionicons name="home-outline" size={24} color={activeTab === 'Home' ? '#fff' : '#aaa'} />
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Explore' && styles.tabActive]}
          onPress={() => setActiveTab('Explore')}
        >
          <Ionicons name="compass-outline" size={24} color={activeTab === 'Explore' ? '#fff' : '#aaa'} />
          <Text style={[styles.tabLabel, activeTab === 'Explore' && styles.tabLabelActive]}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'Search' && styles.tabActive]}
          onPress={() => setActiveTab('Search')}
        >
          <Ionicons name="search-outline" size={24} color={activeTab === 'Search' ? '#fff' : '#aaa'} />
          <Text style={[styles.tabLabel, activeTab === 'Search' && styles.tabLabelActive]}>Search</Text>
        </TouchableOpacity>
      </View>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? 50 : 0,
  },
  content: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  searchStack: {
    gap: 12,
    marginBottom: 20,
  },
  inputFull: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#f0a040',
  },
  buttonFull: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    height: 50,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  resultsContainer: {
    flex: 1,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cityName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  temperature: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  forecastSection: {
    marginBottom: 20,
  },
  forecastItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  forecastDate: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 60,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#111',
    paddingBottom: Platform.OS === 'android' ? 8 : 16,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  tabActive: {
    backgroundColor: '#0e0e0e',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },

});
