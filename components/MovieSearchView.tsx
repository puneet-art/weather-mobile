import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ky from 'ky';
import { API_URL, SearchResult } from './types';

interface MovieSearchViewProps {
    darkMode: boolean;
}

const MovieSearchView: React.FC<MovieSearchViewProps> = ({ darkMode }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('Films'); // Default to Films
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const fetchSearchResults = async (queryOverride?: string) => {
        setSearchLoading(true);
        try {
            const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim() || '';
            const endpoint = filterType === 'Actors' ? 'actors' : 'films';
            const response: any[] = await ky.get(`${API_URL}/search/${endpoint}`, { searchParams: { q } }).json();

            const mapped = response.map((item: any, i: number) => {
                if (endpoint === 'films') {
                    return {
                        id: item.film_id,
                        title: item.title,
                        subtitle: item.release_year?.toString() || '2023',
                        description: item.description || 'A thrilling adventure through the world of cinema.',
                        tag: (item.genres && item.genres.length > 0) ? item.genres[0] : 'General',
                        type: 'Film'
                    };
                } else {
                    return {
                        id: item.actor_id,
                        title: `${item.first_name} ${item.last_name}`,
                        subtitle: 'Actor',
                        description: `Actor details from the database.`,
                        tag: 'Celebrity',
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
        fetchSearchResults();
    }, [filterType]); // Fetch when filter changes

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <View style={[styles.searchOuter, darkMode ? styles.darkSearchOuter : styles.lightSearchOuter]}>
                        <Ionicons name="search-outline" size={20} color={darkMode ? '#888' : '#aaa'} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, darkMode ? styles.whiteText : styles.darkText]}
                            placeholder="Search titles, actors, genres..."
                            placeholderTextColor={darkMode ? '#555' : '#aaa'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={() => fetchSearchResults()}
                            returnKeyType="search"
                        />
                    </View>
                </View>

                <View style={styles.filterRow}>
                    {['Films', 'Actors'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.filterButton,
                                filterType === type ? styles.activeFilterButton : (darkMode ? styles.darkFilterButton : styles.lightFilterButton)
                            ]}
                            onPress={() => setFilterType(type)}
                        >
                            <Ionicons
                                name={type === 'Films' ? 'film-outline' : 'people-outline'}
                                size={16}
                                color={filterType === type ? '#fff' : (darkMode ? '#aaa' : '#666')}
                            />
                            <Text style={[
                                styles.filterButtonText,
                                filterType === type ? styles.whiteText : (darkMode ? styles.greyText : styles.lightGreyText)
                            ]}>
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.resultsInfoRow}>
                    <Text style={[styles.resultsCount, darkMode ? styles.greyText : styles.lightGreyText]}>
                        {searchResults.length} {filterType === 'Actors' ? 'actors' : 'films'} found
                    </Text>
                </View>

                {searchLoading ? (
                    <ActivityIndicator size="large" color="#f0a040" style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.gridContainer}>
                        {searchResults.map((item) => (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                key={`${item.type}-${item.id}`}
                                style={[styles.gridCard, darkMode ? styles.darkCard : styles.lightCard]}
                            >
                                {item.image && (
                                    <ImageBackground
                                        source={{ uri: item.image }}
                                        style={styles.cardImageBackground}
                                        imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                                    >
                                        <View style={styles.cardOverlayGradient}>
                                            <View style={styles.cardHeaderRow}>
                                                <View style={styles.tagBadge}>
                                                    <Text style={styles.tagText}>{item.tag}</Text>
                                                </View>
                                            </View>
                                            {item.type === 'Film' && (
                                                <View style={styles.playIconContainer}>
                                                    <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
                                                </View>
                                            )}
                                            <View />
                                        </View>
                                    </ImageBackground>
                                )}
                                <View style={styles.cardContent}>
                                    {!item.image && (
                                        <View style={[styles.tagBadge, { marginBottom: 8, backgroundColor: darkMode ? 'rgba(240, 160, 64, 0.15)' : 'rgba(240, 160, 64, 0.1)', borderColor: '#f0a040', borderWidth: 0.5 }]}>
                                            <Text style={[styles.tagText, { color: '#f0a040' }]}>{item.tag}</Text>
                                        </View>
                                    )}
                                    <Text style={[styles.cardTitle, darkMode ? styles.whiteText : styles.darkText]} numberOfLines={1}>{item.title}</Text>
                                    <View style={styles.cardMetaRow}>
                                        <Ionicons name="calendar-outline" size={12} color="#f0a040" />
                                        <Text style={styles.cardMetaText}>{item.subtitle}</Text>
                                    </View>
                                    <Text style={[styles.cardDescription, darkMode ? styles.greyText : styles.lightGreyText]} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    searchContainer: {
        paddingTop: 10,
    },
    searchInputContainer: {
        marginBottom: 25,
    },
    searchOuter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 60,
        borderWidth: 1.5,
    },
    darkSearchOuter: {
        backgroundColor: '#1c2635',
        borderColor: '#2d3748',
    },
    lightSearchOuter: {
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        outlineStyle: 'none' as any,
        borderWidth: 0,
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
    },
    activeFilterButton: {
        backgroundColor: '#f0a040',
        borderColor: '#f0a040',
    },
    darkFilterButton: {
        backgroundColor: '#1c2635',
        borderColor: '#2d3748',
    },
    lightFilterButton: {
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '700',
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
    resultsInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    resultsCount: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(240, 160, 64, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    syncText: {
        color: '#f0a040',
        fontSize: 13,
        fontWeight: '700',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 30,
    },
    gridCard: {
        width: '48%',
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        borderWidth: 1,
    },
    darkCard: {
        backgroundColor: '#1c2635',
        borderColor: 'rgba(255,255,255,0.05)',
    },
    lightCard: {
        backgroundColor: '#fff',
        borderColor: '#f1f5f9',
    },
    cardImageBackground: {
        width: '100%',
        height: 180,
    },
    cardOverlayGradient: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        padding: 12,
        justifyContent: 'space-between',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(240, 160, 64, 0.95)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        gap: 4,
    },
    ratingText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    tagBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    tagText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    cardContent: {
        padding: 15,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    cardMetaText: {
        fontSize: 13,
        color: '#f0a040',
        fontWeight: '600',
    },
    cardDescription: {
        fontSize: 12,
        lineHeight: 18,
        opacity: 0.8,
    },
});

export default MovieSearchView;
