import { Platform } from 'react-native';

export const API_URL: string = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

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
    id: number;
    title: string;
    subtitle: string;
    description: string;
    tag: string;
    image?: string;
    type: string;
}

export type Tab = 'Weather' | 'Search' | 'Profile';
