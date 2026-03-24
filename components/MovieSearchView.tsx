import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    ImageBackground,
    Modal,
    Dimensions,
    Platform,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ky from 'ky';
import { API_URL, SearchResult } from './types';
import { useDebounce } from '../hooks/useDebounce';

const { width, height } = Dimensions.get('window');

interface MovieSearchViewProps {
    darkMode: boolean;
}

const MovieSearchView: React.FC<MovieSearchViewProps> = ({ darkMode }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 600);
    const [filterType, setFilterType] = useState('All'); // All, Films, Actors
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [genres, setGenres] = useState<string[]>([]);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('relevance');
    const [showFilters, setShowFilters] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalResults, setTotalResults] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [showTypePicker, setShowTypePicker] = useState(false);


    // Actor Detail Modal State
    const [selectedActor, setSelectedActor] = useState<any>(null);
    const [actorLoading, setActorLoading] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    // Movie Detail Modal State
    const [selectedFilm, setSelectedFilm] = useState<any>(null);
    const [filmLoading, setFilmLoading] = useState(false);
    const [filmModalVisible, setFilmModalVisible] = useState(false);

    // useRef for mutable pagination tracking (avoids stale closure bug)
    const flatListRef = useRef<FlatList>(null);
    const pageRef = useRef(1);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const lastFetchParams = useRef<string>('');


    // Helper to chunk results for the 2-column grid
    const chunkResults = (arr: SearchResult[], size: number) => {
        const chunked = [];
        for (let i = 0; i < arr.length; i += size) {
            chunked.push(arr.slice(i, i + size));
        }
        return chunked;
    };

    const fetchGenres = async () => {
        try {
            const data: any = await ky.get(`${API_URL}/search/categories`, { timeout: 60000 }).json();
            const categories = Array.isArray(data) ? data.map((c: any) => typeof c === 'string' ? c : c.name) : [];
            setGenres(categories);
        } catch (e) {
            console.error('Failed to fetch genres:', e);
        }
    };


    const fetchSearchResults = useCallback(async (targetPage = 1) => {
        // Prevent duplicate loads using refs
        if (loadingMoreRef.current && targetPage > 1) return;
        if (loadingMoreRef.current && targetPage === 1) return;

        console.log(`[Fetch] page: ${targetPage}, filterType: ${filterType}`);
        
        if (targetPage === 1) {
            setSearchLoading(true);
            setSearchResults([]); 
        } else {
            setLoadingMore(true);
            loadingMoreRef.current = true;
        }
        
        setError(null);

        try {
            const startTime = Date.now();
            const q = debouncedSearchQuery.trim() || '';
            const endpoint = filterType === 'Actors' ? 'actors' : (filterType === 'All' ? 'all' : 'films');
            const limit = 20;
            
            const params: any = { q, page: targetPage, limit, _t: Date.now() };
            if (endpoint === 'films' || endpoint === 'all') {
                if (selectedGenre) params.genre = selectedGenre;
                if (sortBy !== 'relevance') params.sortBy = sortBy;
            }

            const targetUrl = `${API_URL}/search/${endpoint}`;
            console.log(`[Fetch] URL: ${targetUrl}, params:`, JSON.stringify(params));

            const response = await ky.get(targetUrl, { 
                searchParams: params,
                timeout: 60000,
                retry: 0
            });

            const result: any = await response.json();
            
            let data: any[] = [];
            let total = 0;
            let hasNext = false;
            let totalPgs = 1;

            if (filterType === 'All') {
                const films = (result.films?.data || []).map((f: any) => ({ ...f, type: 'Film' }));
                const actors = (result.actors?.data || []).map((a: any) => ({ ...a, type: 'Actor' }));
                data = [...films, ...actors];
                total = (result.films?.meta?.total || 0) + (result.actors?.meta?.total || 0);
                hasNext = (result.films?.meta?.has_next_page || false) || (result.actors?.meta?.has_next_page || false);
                totalPgs = Math.max(result.films?.meta?.total_pages || 1, result.actors?.meta?.total_pages || 1);
            } else {
                data = result.data || [];
                total = result.meta?.total || 0;
                totalPgs = result.meta?.total_pages || 1;
                hasNext = result.meta?.has_next_page || false;
            }

            // Safety check: if we got no data but API said hasNext, respect actual data length for future loads
            if (data.length === 0 && targetPage > 1) {
                hasNext = false;
            }

            console.log(`[Fetch] Received ${data.length} items. totalPgs: ${totalPgs}, total: ${total}, page: ${targetPage}`);

            const mapped = data.map((item: any) => {
                if (item.type === 'Film' || endpoint === 'films') {
                    return {
                        id: String(item.film_id || item.id),
                        title: item.title || '',
                        subtitle: item.release_year?.toString() || '',
                        description: item.description || '',
                        tag: item.genres?.[0] || '',
                        type: 'Film'
                    } as SearchResult;
                } else {
                    const name = `${item.first_name || ''} ${item.last_name || ''}`.trim();
                    return {
                        id: String(item.actor_id || item.id),
                        title: name,
                        subtitle: item.location || '',
                        description: item.bio || (item.films?.length > 0 ? `Films: ${item.films.slice(0, 2).join(', ')}` : ''),
                        tag: 'Actor',
                        type: 'Actor'
                    } as SearchResult;
                }
            });

            if (targetPage === 1) {
                setSearchResults(mapped);
            } else {
                setSearchResults(prev => [...prev, ...mapped]);
            }
            
            setTotalResults(total);
            setTotalPages(totalPgs);
            setPage(targetPage);
            setHasMore(hasNext);
            
            pageRef.current = targetPage;
            hasMoreRef.current = hasNext;
            
        } catch (e: any) {
            console.error('[Fetch] Error:', e);
            const errorMsg = e.message || 'Network error';
            setError(errorMsg);
        } finally {
            setSearchLoading(false);
            setLoadingMore(false);
            loadingMoreRef.current = false;
        }
    }, [debouncedSearchQuery, filterType, selectedGenre, sortBy]); // Removed searchLoading dependency

    const fetchActorDetails = async (actorId: number | string) => {
        setActorLoading(true);
        setDetailModalVisible(true);
        setSelectedActor(null); // Reset detail view
        try {
            const data = await ky.get(`${API_URL}/search/actors/${actorId}`, { timeout: 60000 }).json();
            setSelectedActor(data);
        } catch (e) {
            console.error('Failed to fetch actor details:', e);
            Alert.alert('Error', 'Could not load actor details.');
            setDetailModalVisible(false);
        } finally {
            setActorLoading(false);
        }
    };

    const fetchFilmDetails = async (filmId: number | string) => {
        setFilmLoading(true);
        setFilmModalVisible(true);
        setSelectedFilm(null);
        try {
            const data = await ky.get(`${API_URL}/search/films/${filmId}`, { timeout: 60000 }).json();
            setSelectedFilm(data);
        } catch (e) {
            console.error('Failed to fetch film details:', e);
            Alert.alert('Error', 'Could not load movie details.');
            setFilmModalVisible(false);
        } finally {
            setFilmLoading(false);
        }
    };

    useEffect(() => {
        fetchGenres();
    }, []);

    useEffect(() => {
        fetchSearchResults(1);
    }, [fetchSearchResults]);

    const handleLoadMore = useCallback(() => {
        if (!searchLoading && !loadingMore && hasMoreRef.current && searchResults.length > 0) {
            console.log('[Pagination] Loading more... Next page:', pageRef.current + 1);
            fetchSearchResults(pageRef.current + 1);
        }
    }, [searchLoading, loadingMore, fetchSearchResults]);

    const globalIndex = (idx: number) => idx + 1;


    const renderItem = ({ item, index }: { item: SearchResult; index: number }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            key={`${item.type}-${item.id}`}
            style={[styles.gridCard, darkMode ? styles.darkCard : styles.lightCard]}
            onPress={() => item.type === 'Film' ? fetchFilmDetails(item.id) : fetchActorDetails(item.id)}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                    <View style={styles.indexBadge}>
                        <Text style={styles.indexText}>#{globalIndex(index)}</Text>
                    </View>
                    {item.tag && item.tag !== 'Actor' ? (
                        <View style={[styles.tagBadge, { 
                            backgroundColor: darkMode ? 'rgba(240, 160, 64, 0.15)' : 'rgba(240, 160, 64, 0.1)', 
                            borderColor: '#f0a040', 
                            borderWidth: 0.5 
                        }]}>
                            <Text style={[styles.tagText, { color: '#f0a040' }]}>{item.tag}</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={[styles.cardTitle, darkMode ? styles.whiteText : styles.darkText]} numberOfLines={1}>{item.title}</Text>
                <View style={styles.cardMetaRow}>
                    <Ionicons name={item.type === 'Film' ? "calendar-outline" : "location-outline"} size={12} color="#f0a040" />
                    <Text style={[styles.cardMetaText, { flexShrink: 1 }]} numberOfLines={1}>{item.subtitle === 'Actor' ? (item.tag !== 'Actor' ? item.tag : 'Actor') : item.subtitle}</Text>
                </View>
                <Text style={[styles.cardDescription, darkMode ? styles.greyText : styles.lightGreyText]} numberOfLines={2}>
                    {item.description}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderHeaderContent = () => (
        <View style={styles.headerComponent}>
            <View style={styles.searchInputContainer}>
                <View style={[styles.searchOuter, darkMode ? styles.darkSearchOuter : styles.lightSearchOuter]}>
                    <Ionicons name="search-outline" size={20} color={darkMode ? '#888' : '#aaa'} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, darkMode ? styles.whiteText : styles.darkText]}
                        placeholder="Search titles, actors, genres..."
                        placeholderTextColor={darkMode ? '#555' : '#aaa'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => fetchSearchResults(1)}
                        returnKeyType="search"
                    />
                    <TouchableOpacity 
                        style={[styles.filterIconButton, showFilters && styles.activeFilterIconButton]} 
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Ionicons name="options-outline" size={22} color={showFilters ? '#fff' : (darkMode ? '#aaa' : '#666')} />
                    </TouchableOpacity>
                </View>

                {showFilters && (
                    <View style={styles.advancedFiltersSection}>
                        <Text style={[styles.filterLabel, darkMode ? styles.whiteText : styles.darkText]}>Search In</Text>
                        <TouchableOpacity 
                            style={[styles.dropdownTrigger, darkMode ? styles.darkCard : styles.lightCard]}
                            onPress={() => setShowTypePicker(!showTypePicker)}
                        >
                            <View style={styles.dropdownInner}>
                                <Ionicons 
                                    name={filterType === 'All' ? 'grid-outline' : (filterType === 'Films' ? 'film-outline' : 'people-outline')} 
                                    size={18} 
                                    color="#f0a040" 
                                />
                                <Text style={[styles.dropdownValue, darkMode ? styles.whiteText : styles.darkText]}>{filterType}</Text>
                            </View>
                            <Ionicons name={showTypePicker ? "chevron-up" : "chevron-down"} size={20} color="#f0a040" />
                        </TouchableOpacity>

                        {showTypePicker && (
                            <View style={[styles.dropdownMenu, darkMode ? styles.darkMenu : styles.lightMenu]}>
                                {['All', 'Films', 'Actors'].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.dropdownOption, filterType === type && styles.activeDropdownOption]}
                                        onPress={() => {
                                            setFilterType(type);
                                            setShowTypePicker(false);
                                            if (type === 'Actors') setSelectedGenre(null);
                                        }}
                                    >
                                        <Ionicons 
                                            name={type === 'All' ? 'grid-outline' : (type === 'Films' ? 'film-outline' : 'people-outline')} 
                                            size={16} 
                                            color={filterType === type ? '#f0a040' : (darkMode ? '#aaa' : '#666')} 
                                        />
                                        <Text style={[styles.dropdownOptionText, darkMode ? styles.whiteText : styles.darkText, filterType === type && { color: '#f0a040' }]}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {(filterType === 'Films' || filterType === 'All') && (
                            <>
                                <Text style={[styles.filterLabel, { marginTop: 20 }, darkMode ? styles.whiteText : styles.darkText]}>Sort By</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContainer}>
                                    {[
                                        { id: 'relevance', label: 'Relevance' },
                                        { id: 'latest', label: 'Latest Release' }
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.id}
                                            style={[
                                                styles.filterChip,
                                                sortBy === option.id ? styles.activeFilterChip : (darkMode ? styles.darkFilterChip : styles.lightFilterChip)
                                            ]}
                                            onPress={() => setSortBy(option.id)}
                                        >
                                            <Text style={[
                                                styles.filterChipText,
                                                sortBy === option.id ? styles.whiteText : (darkMode ? styles.greyText : styles.lightGreyText)
                                            ]}>{option.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </View>
                )}
            </View>


            {(filterType === 'Films' || filterType === 'All') && (
                <View style={styles.categoriesSection}>
                    <Text style={[styles.filterLabel, { marginLeft: 2, marginBottom: 15 }, darkMode ? styles.whiteText : styles.darkText]}>Explore Categories</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryCardsContainer}>
                        {genres.length > 0 ? genres.map((genre) => (
                            <TouchableOpacity
                                key={genre}
                                style={[
                                    styles.categoryCard,
                                    selectedGenre === genre ? styles.activeCategoryCard : (darkMode ? styles.darkCategoryCard : styles.lightCategoryCard)
                                ]}
                                onPress={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                            >
                                <View style={styles.categoryCardIcon}>
                                    <Ionicons name="film" size={24} color={selectedGenre === genre ? '#fff' : '#f0a040'} />
                                </View>
                                <Text style={[
                                    styles.categoryCardText,
                                    selectedGenre === genre ? styles.whiteText : (darkMode ? styles.whiteText : styles.darkText)
                                ]}>{genre}</Text>
                            </TouchableOpacity>
                        )) : (
                            [1, 2, 3, 4].map(i => (
                                <View key={i} style={[styles.categoryCard, styles.skeletonCard, darkMode ? styles.darkCard : styles.lightCard]} />
                            ))
                        )}
                    </ScrollView>
                </View>
            )}

            <View style={styles.resultsInfoRow}>
                <View style={styles.resultsInfoInner}>
                    <Text style={[styles.resultsCount, darkMode ? styles.greyText : styles.lightGreyText]}>
                        {totalResults} {totalResults === 1 ? 'result' : 'results'} found
                    </Text>
                </View>
                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </View>
        </View>
    );
    const renderFooterContent = () => {
        if (loadingMore) {
            return (
                <View style={[styles.paginationSection, { paddingBottom: 50 }]}>
                    <ActivityIndicator size="large" color="#f0a040" />
                    <Text style={[styles.loadingText, darkMode ? styles.greyText : styles.lightGreyText]}>
                        Loading more...
                    </Text>
                </View>
            );
        }

        if (searchLoading && searchResults.length === 0) {
            return (
                <View style={[styles.paginationSection, { marginTop: 100 }]}>
                    <ActivityIndicator size="large" color="#f0a040" />
                    <Text style={[styles.loadingText, darkMode ? styles.greyText : styles.lightGreyText]}>
                        Searching...
                    </Text>
                </View>
            );
        }

        if (!hasMore && searchResults.length > 0) {
            return (
                <View style={styles.paginationSection}>
                    <Ionicons name="checkmark-circle-outline" size={30} color={darkMode ? '#333' : '#ccc'} />
                    <Text style={[styles.endText, darkMode ? styles.greyText : styles.lightGreyText]}>
                        You've reached the end! {totalResults} results found.
                    </Text>
                </View>
            );
        }

        return <View style={{ height: 100 }} />;
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={flatListRef as any}
                style={{ flex: 1 }}
                contentContainerStyle={styles.flatListContent}
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 150;
                    if (isCloseToBottom) {
                        handleLoadMore();
                    }
                }}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={searchLoading}
                        onRefresh={() => fetchSearchResults(1)}
                        tintColor="#f0a040"
                        colors={["#f0a040"]}
                    />
                }
            >
                {renderHeaderContent()}
                
                <View style={styles.resultsGrid}>
                    {chunkResults(searchResults || [], 2).map((row, rowIndex) => (
                        <View key={`row-${rowIndex}`} style={styles.row}>
                            {row.map((item, colIndex) => (
                                <View key={`${item.type}-${item.id}`} style={styles.gridColumn}>
                                    {renderItem({ item, index: rowIndex * 2 + colIndex })}
                                </View>
                            ))}
                            {row.length === 1 && <View style={styles.gridColumn} />}
                        </View>
                    ))}
                </View>

                {renderFooterContent()}
            </ScrollView>

            {/* Actor Detail Modal */}
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, darkMode ? styles.darkModal : styles.lightModal]}>
                        <View style={[styles.modalHandle, { backgroundColor: darkMode ? '#2d3748' : '#e2e8f0' }]} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, darkMode ? styles.whiteText : styles.darkText]}>Actor Profile</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setDetailModalVisible(false)}>
                                <Ionicons name="close" size={24} color={darkMode ? '#fff' : '#000'} />
                            </TouchableOpacity>
                        </View>
                        
                        {actorLoading ? (
                            <View style={styles.loaderCenter}>
                                <ActivityIndicator size="large" color="#f0a040" />
                                <Text style={[styles.loadingText, darkMode ? styles.greyText : styles.lightGreyText]}>Loading details...</Text>
                            </View>
                        ) : selectedActor ? (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                                <View style={styles.actorProfile}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Ionicons name="person" size={60} color="#f0a040" />
                                    </View>
                                    <Text style={[styles.actorName, darkMode ? styles.whiteText : styles.darkText]}>
                                        {selectedActor.first_name} {selectedActor.last_name}
                                    </Text>
                                    <View style={styles.actorBadge}>
                                        <Text style={styles.actorBadgeText}>ID: {selectedActor.actor_id}</Text>
                                    </View>
                                    {selectedActor.location && (
                                        <View style={styles.locationRow}>
                                            <Ionicons name="location-outline" size={16} color="#f0a040" />
                                            <View style={styles.actorBadge}>
                                                <Text style={styles.actorBadgeText}>{selectedActor.location || 'Unknown Location'}</Text>
                                            </View>
                                        </View>
                                    )}
                                    <Text style={[styles.actorBio, darkMode ? styles.greyText : styles.lightGreyText]}>
                                        {selectedActor.bio || ''}
                                    </Text>
                                </View>

                                <View style={styles.filmographySection}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="film" size={20} color="#f0a040" />
                                        <Text style={[styles.sectionTitle, darkMode ? styles.whiteText : styles.darkText]}>Filmography</Text>
                                    </View>
                                    {selectedActor.films && selectedActor.films.length > 0 ? (
                                        selectedActor.films.map((film: any) => (
                                            <TouchableOpacity 
                                                key={film.film_id} 
                                                style={[styles.filmItem, darkMode ? styles.darkFilmItem : styles.lightFilmItem]}
                                                onPress={() => {
                                                    setDetailModalVisible(false);
                                                    fetchFilmDetails(film.film_id);
                                                }}
                                            >
                                                <View style={styles.filmIconBox}>
                                                    <Ionicons name="videocam-outline" size={20} color="#f0a040" />
                                                </View>
                                                <View style={styles.filmInfo}>
                                                    <Text style={[styles.filmTitle, darkMode ? styles.whiteText : styles.darkText]}>{film.title}</Text>
                                                    <View style={styles.filmYearRow}>
                                                        <Ionicons name="calendar-outline" size={12} color={darkMode ? '#666' : '#999'} />
                                                        <Text style={[styles.filmYear, darkMode ? styles.greyText : styles.lightGreyText]}>{film.release_year || 'N/A'}</Text>
                                                    </View>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color={darkMode ? '#333' : '#ccc'} />
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <View style={styles.emptyFilms}>
                                            <Ionicons name="alert-circle-outline" size={40} color={darkMode ? '#333' : '#ccc'} />
                                            <Text style={[styles.emptyText, darkMode ? styles.greyText : styles.lightGreyText]}>No films found for this actor.</Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>

            {/* Movie Detail Modal */}
            <Modal
                visible={filmModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFilmModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, darkMode ? styles.darkModal : styles.lightModal]}>
                        <View style={[styles.modalHandle, { backgroundColor: darkMode ? '#2d3748' : '#e2e8f0' }]} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, darkMode ? styles.whiteText : styles.darkText]}>Movie Details</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setFilmModalVisible(false)}>
                                <Ionicons name="close" size={24} color={darkMode ? '#fff' : '#000'} />
                            </TouchableOpacity>
                        </View>
                        
                        {filmLoading ? (
                            <View style={styles.loaderCenter}>
                                <ActivityIndicator size="large" color="#f0a040" />
                                <Text style={[styles.loadingText, darkMode ? styles.greyText : styles.lightGreyText]}>Loading details...</Text>
                            </View>
                        ) : selectedFilm ? (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                                <View style={styles.actorProfile}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Ionicons name="film" size={60} color="#f0a040" />
                                    </View>
                                    <Text style={[styles.actorName, darkMode ? styles.whiteText : styles.darkText]}>
                                        {selectedFilm.title}
                                    </Text>
                                    <View style={styles.actorBadge}>
                                        <Text style={styles.actorBadgeText}>{selectedFilm.release_year || 'N/A'}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                                        {(selectedFilm.genres || []).map((genre: string) => (
                                            <View key={genre} style={[styles.filterChip, darkMode ? styles.darkFilterChip : styles.lightFilterChip]}>
                                                <Text style={[styles.filterChipText, darkMode ? styles.greyText : styles.lightGreyText]}>{genre}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={[styles.actorBio, darkMode ? styles.greyText : styles.lightGreyText, { marginTop: 25 }]}>
                                        {selectedFilm.description || ''}
                                    </Text>
                                </View>

                                <View style={styles.filmographySection}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="people" size={20} color="#f0a040" />
                                        <Text style={[styles.sectionTitle, darkMode ? styles.whiteText : styles.darkText]}>Cast</Text>
                                    </View>
                                    {selectedFilm.actors && selectedFilm.actors.length > 0 ? (
                                        selectedFilm.actors.map((actor: any) => (
                                            <TouchableOpacity 
                                                key={actor.actor_id} 
                                                style={[styles.filmItem, darkMode ? styles.darkFilmItem : styles.lightFilmItem]}
                                                onPress={() => {
                                                    setFilmModalVisible(false);
                                                    fetchActorDetails(actor.actor_id);
                                                }}
                                            >
                                                <View style={styles.filmIconBox}>
                                                    <Ionicons name="person-outline" size={20} color="#f0a040" />
                                                </View>
                                                <View style={styles.filmInfo}>
                                                    <Text style={[styles.filmTitle, darkMode ? styles.whiteText : styles.darkText]}>
                                                        {actor.first_name} {actor.last_name}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color={darkMode ? '#333' : '#ccc'} />
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <View style={styles.emptyFilms}>
                                            <Ionicons name="alert-circle-outline" size={40} color={darkMode ? '#333' : '#ccc'} />
                                            <Text style={[styles.emptyText, darkMode ? styles.greyText : styles.lightGreyText]}>No cast information found.</Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerComponent: {
        paddingBottom: 10,
    },
    flatListContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    resultsGrid: {
        marginTop: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    featuredSection: {
        marginBottom: 30,
        marginTop: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    sectionHeading: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    paginationDots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        backgroundColor: '#f0a040',
        width: 20,
    },
    darkDot: {
        backgroundColor: '#2d3748',
    },
    lightDot: {
        backgroundColor: '#e2e8f0',
    },
    featuredList: {
        paddingRight: 20,
    },
    featuredSlide: {
        width: width - 40,
        marginRight: 20,
    },
    featuredCard: {
        height: 180,
        borderRadius: 24,
        padding: 20,
        justifyContent: 'space-between',
        borderWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    darkFeaturedCard: {
        backgroundColor: '#1c2635',
        borderColor: '#2d3748',
    },
    lightFeaturedCard: {
        backgroundColor: '#fff',
        borderColor: '#f1f5f9',
    },
    featuredBadge: {
        backgroundColor: '#f0a040',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    featuredBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    featuredTextContent: {
        marginTop: 10,
    },
    featuredYear: {
        color: '#f0a040',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    featuredTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    featuredDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
    },
    featuredFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
    },
    featuredTag: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    featuredTagText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    playButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f0a040',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    searchInputContainer: {
        marginBottom: 20,
    },
    searchOuter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 60,
        borderWidth: 1.5,
    },
    filterIconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    activeFilterIconButton: {
        backgroundColor: '#f0a040',
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
    genresWrapper: {
        marginBottom: 25,
        marginHorizontal: -20,
    },
    genresContainer: {
        paddingHorizontal: 20,
        gap: 10,
    },
    genreChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
    },
    activeGenreChip: {
        backgroundColor: '#f0a040',
        borderColor: '#f0a040',
    },
    darkGenreChip: {
        backgroundColor: '#1c2635',
        borderColor: '#2d3748',
    },
    lightGenreChip: {
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
    },
    genreChipText: {
        fontSize: 13,
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
        marginBottom: 25,
        paddingHorizontal: 8,
        marginTop: 10,
    },
    resultsCount: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    resultsInfoInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    gridCard: {
        width: '100%',
        borderRadius: 20,
        marginBottom: 10,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        borderWidth: 1,
    },
    gridColumn: {
        width: '47.5%', // Slightly less than 50% to account for gap
    },
    darkCard: {
        backgroundColor: '#1c2635',
        borderColor: 'rgba(255,255,255,0.05)',
    },
    lightCard: {
        backgroundColor: '#fff',
        borderColor: '#f1f5f9',
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
    tagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    tagText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    advancedFiltersSection: {
        marginTop: 20,
        paddingBottom: 10,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        opacity: 0.8,
    },
    filterChipsContainer: {
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeFilterChip: {
        backgroundColor: '#f0a040',
        borderColor: '#f0a040',
    },
    darkFilterChip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    lightFilterChip: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    indexBadge: {
        backgroundColor: 'rgba(240, 160, 64, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(240, 160, 64, 0.3)',
    },
    indexText: {
        color: '#f0a040',
        fontSize: 10,
        fontWeight: 'bold',
    },
    paginationSection: {
        marginVertical: 30,
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 15,
        padding: 5,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    darkPagination: {
        backgroundColor: '#1c2635',
    },
    lightPagination: {
        backgroundColor: '#fff',
    },
    pageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 5,
    },
    disabledPageButton: {
        opacity: 0.5,
    },
    pageButtonText: {
        color: '#f0a040',
        fontSize: 14,
        fontWeight: 'bold',
    },
    pageIndicator: {
        paddingHorizontal: 15,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
    },
    pageIndicatorText: {
        fontSize: 14,
        fontWeight: '600',
    },
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        marginVertical: 20,
        gap: 8,
        borderWidth: 1,
    },
    darkLoadMore: {
        backgroundColor: '#1c2635',
        borderColor: 'rgba(255,255,255,0.05)',
    },
    lightLoadMore: {
        backgroundColor: '#fff',
        borderColor: '#f1f5f9',
    },
    loadMoreText: {
        color: '#f0a040',
        fontSize: 14,
        fontWeight: 'bold',
    },
    endText: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: height * 0.85,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 25,
        paddingTop: 10,
    },
    darkModal: {
        backgroundColor: '#121b2b',
    },
    lightModal: {
        backgroundColor: '#fff',
    },
    modalHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 15,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    closeButton: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    modalScroll: {
        paddingBottom: 50,
    },
    actorProfile: {
        alignItems: 'center',
        marginBottom: 35,
    },
    avatarPlaceholder: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(240, 160, 64, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 3,
        borderColor: '#f0a040',
        shadowColor: '#f0a040',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    actorName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    actorBadge: {
        backgroundColor: 'rgba(240, 160, 64, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 15,
    },
    actorBadgeText: {
        color: '#f0a040',
        fontSize: 12,
        fontWeight: 'bold',
    },
    actorBio: {
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 10,
        lineHeight: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    filmographySection: {
        marginBottom: 30,
    },
    filmItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        marginBottom: 12,
    },
    darkFilmItem: {
        backgroundColor: '#1c2635',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    lightFilmItem: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    filmIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(240, 160, 64, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    filmInfo: {
        flex: 1,
    },
    filmTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
    },
    filmYearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    filmYear: {
        fontSize: 13,
        fontWeight: '500',
    },
    loaderCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyFilms: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 15,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 8,
        borderRadius: 8,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '600',
    },
    categoriesSection: {
        marginBottom: 25,
    },
    categoryCardsContainer: {
        gap: 15,
        paddingBottom: 5,
    },
    categoryCard: {
        width: 100,
        height: 110,
        borderRadius: 20,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    darkCategoryCard: {
        backgroundColor: '#1c2635',
        borderColor: 'rgba(255,255,255,0.05)',
    },
    lightCategoryCard: {
        backgroundColor: '#fff',
        borderColor: '#f1f5f9',
    },
    activeCategoryCard: {
        backgroundColor: '#f0a040',
        borderColor: '#f0a040',
    },
    categoryCardIcon: {
        marginBottom: 10,
    },
    categoryCardText: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    skeletonCard: {
        opacity: 0.5,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 15,
    },
    locationText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(240, 160, 64, 0.2)',
        marginTop: 5,
    },
    dropdownInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dropdownValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    dropdownMenu: {
        marginTop: 8,
        borderRadius: 15,
        padding: 8,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        zIndex: 1000,
    },
    darkMenu: {
        backgroundColor: '#1c2635',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    lightMenu: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 12,
        marginBottom: 2,
    },
    activeDropdownOption: {
        backgroundColor: 'rgba(240, 160, 64, 0.1)',
    },
    dropdownOptionText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default MovieSearchView;
