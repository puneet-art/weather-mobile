import { Platform } from 'react-native';

// @ts-ignore
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://movie-backend-1-9sjw.onrender.com'; 
export const API_URL: string = __DEV__ ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000') : PROD_API_URL;

export interface WeatherData {
    city: string;
    temperature: number;
    condition?: string; // 'sunny', 'rainy', 'cloudy', 'clear', etc.
    description?: string;
    humidity?: number;
    windSpeed?: number;
}

export interface ForecastItem {
    date: string;
    temperature: number;
}

export interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    tag: string;
    image?: string;
    type: string;
}

export type Tab = 'Weather' | 'Search' | 'Profile';
