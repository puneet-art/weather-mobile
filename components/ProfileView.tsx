import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileViewProps {
    darkMode: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ darkMode }) => {
    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.comingSoonContainer}>
                <Ionicons
                    name="person-outline"
                    size={100}
                    color={darkMode ? '#444' : '#ccc'}
                />
                <Text style={[styles.comingSoonTitle, darkMode ? styles.whiteText : styles.darkText]}>
                    Profile Feature
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
                <Text style={[styles.comingSoonSubtitle, darkMode ? styles.greyText : styles.lightGreyText]}>
                    We are working hard to bring you the profile experience. Stay tuned!
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
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
});

export default ProfileView;
