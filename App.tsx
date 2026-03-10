/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Tab } from './components/types';
import WeatherView from './components/WeatherView';
import MovieSearchView from './components/MovieSearchView';
import ProfileView from './components/ProfileView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Weather');
  const darkMode = true;

  return (
    <SafeAreaView style={[styles.container, darkMode ? styles.darkBg : styles.lightBg]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      {/* Dynamic Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, darkMode ? styles.whiteText : styles.darkText]}>
            {activeTab === 'Weather' ? 'Weather' :
              activeTab === 'Search' ? 'Search Films' : 'Profile'}
          </Text>
          <Text style={[styles.headerSubtitle, darkMode ? styles.greyText : styles.lightGreyText]}>
            {activeTab === 'Weather' ? 'Get current weather & forecast' :
              activeTab === 'Search' ? 'Discover your next favorite movie' : 'Manage your account'}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'Weather' && <WeatherView darkMode={darkMode} />}
        {activeTab === 'Search' && <MovieSearchView darkMode={darkMode} />}
        {activeTab === 'Profile' && <ProfileView darkMode={darkMode} />}
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, darkMode ? styles.darkNav : styles.lightNav]}>
        {(['Weather', 'Search', 'Profile'] as Tab[]).map((tab) => {
          const icons: Record<Tab, keyof typeof Ionicons.glyphMap> = {
            Weather: 'cloud-outline',
            Search: 'search-outline',
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
});

export default App;
