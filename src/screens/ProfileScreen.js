import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, firestore, storage } from '../services/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const colors = {
    background: '#000000',
    white: '#FFFFFF',
    lightGrey: '#404040',
    mediumGrey: '#808080',
    buttonGrey: '#333333',
    accent: '#4A90E2',
};

export default function ProfileScreen() {
    const navigation = useNavigation();
    const [userDetails, setUserDetails] = useState({
        fullName: '',
        role: '',
        email: '',
        photoURL: null, // Profile photo URL
        loading: true,
        error: null
    });
    const [stats, setStats] = useState({
        documentsAnalyzed: 0,
        biasesDetected: 0,
        lastAnalysis: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const fetchUserDetails = async () => {
        const user = auth.currentUser;
        
        if (!user) {
            setUserDetails({
                fullName: '',
                role: '',
                email: '',
                photoURL: null,
                loading: false,
                error: 'Please login to view profile'
            });
            navigation.replace('LoginScreen');
            return;
        }

        try {
            // Get user document
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                throw new Error('User profile not found');
            }

            const userData = userDoc.data();
            setUserDetails({
                fullName: userData.fullName || '',
                role: userData.role || '',
                email: user.email || '',
                photoURL: userData.photoURL || null,
                loading: false,
                error: null
            });

            // After user details are loaded, fetch stats
            await fetchUserStats(user.uid);

        } catch (error) {
            console.error('Error fetching user details:', error);
            setUserDetails(prev => ({
                ...prev,
                loading: false,
                error: 'Failed to load profile'
            }));
        }
    };

    const fetchUserStats = async (userId) => {
        if (!userId) return;

        try {
            const analysesRef = collection(firestore, 'analyses');
            const userQuery = query(
                analysesRef,
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(userQuery);
            const analyses = [];
            let totalBiases = 0;

            querySnapshot.forEach(doc => {
                const data = doc.data();
                analyses.push({
                    ...data,
                    createdAt: data.createdAt?.toDate()
                });

                if (data.biasAnalysis) {
                    const biasCount = (data.biasAnalysis.match(/Type:/g) || []).length;
                    totalBiases += biasCount;
                }
            });

            analyses.sort((a, b) => b.createdAt - a.createdAt);

            setStats({
                documentsAnalyzed: analyses.length,
                biasesDetected: totalBiases,
                lastAnalysis: analyses[0]?.createdAt || null,
                loading: false,
                error: null
            });

        } catch (error) {
            console.error('Error fetching user stats:', error);
            setStats(prev => ({
                ...prev,
                loading: false,
                error: 'Failed to load statistics'
            }));
        }
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                alert('Please allow access to your photo library');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                await uploadProfileImage(imageUri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            alert('Failed to pick image');
        }
    };

    const compressImage = async (uri) => {
        try {
            const manipulateResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 500 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            return manipulateResult.uri;
        } catch (error) {
            console.error('Error compressing image:', error);
            throw error;
        }
    };

    const uploadProfileImage = async (uri) => {
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to upload a profile photo');
            return;
        }

        try {
            setUserDetails(prev => ({ ...prev, loading: true }));

            // Compress image
            const compressedUri = await compressImage(uri);
            const response = await fetch(compressedUri);
            const blob = await response.blob();

            // Create storage reference
            const storageRef = ref(storage, `profilePhotos/${user.uid}/profile.jpg`);

            // Upload image
            await uploadBytes(storageRef, blob);

            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Update Firestore
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
                photoURL: downloadURL,
                updatedAt: serverTimestamp()
            });

            // Update local state
            setUserDetails(prev => ({
                ...prev,
                photoURL: downloadURL,
                loading: false
            }));

            alert('Profile photo updated successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload profile photo. Please try again.');
            setUserDetails(prev => ({ ...prev, loading: false }));
        }
    };

    const renderProfilePhoto = () => (
        <TouchableOpacity 
            onPress={pickImage} 
            disabled={userDetails.loading}
            style={styles.profilePhotoContainer}
        >
            {userDetails.photoURL ? (
                <View style={styles.photoWrapper}>
                    <Image
                        source={{ uri: userDetails.photoURL }}
                        style={styles.profilePhoto}
                    />
                    <View style={styles.editBadge}>
                        {userDetails.loading ? (
                            <ActivityIndicator size={12} color="#FFFFFF" />
                        ) : (
                            <MaterialCommunityIcons 
                                name="pencil" 
                                size={12} 
                                color="#FFFFFF" 
                            />
                        )}
                    </View>
                </View>
            ) : (
                <View style={styles.placeholderWrapper}>
                    <MaterialCommunityIcons 
                        name="account-circle" 
                        size={80} 
                        color={colors.accent} 
                    />
                    <View style={styles.editBadge}>
                        <MaterialCommunityIcons 
                            name="plus" 
                            size={12} 
                            color="#FFFFFF" 
                        />
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigation.replace('LoginScreen');
        } catch (error) {
            console.error('Logout Error:', error);
            alert('Failed to logout');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialCommunityIcons 
                        name="arrow-left" 
                        size={24} 
                        color={colors.white} 
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <View style={styles.mainContainer}>
                <ScrollView 
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        {renderProfilePhoto()}
                        {userDetails.loading ? (
                            <ActivityIndicator color={colors.accent} />
                        ) : userDetails.error ? (
                            <Text style={styles.errorText}>{userDetails.error}</Text>
                        ) : (
                            <>
                                <Text style={styles.name}>{userDetails.fullName}</Text>
                                <Text style={styles.email}>{userDetails.email}</Text>
                                <View style={styles.badgeContainer}>
                                    <MaterialCommunityIcons 
                                        name="shield-check" 
                                        size={16} 
                                        color={colors.accent} 
                                    />
                                    <Text style={styles.badgeText}>{userDetails.role}</Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Statistics Section */}
                    <View style={styles.statsSection}>
                        <Text style={styles.sectionTitle}>Analysis Statistics</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>
                                    {stats.loading ? '-' : stats.documentsAnalyzed}
                                </Text>
                                <Text style={styles.statLabel}>Documents Analyzed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>
                                    {stats.loading ? '-' : stats.biasesDetected}
                                </Text>
                                <Text style={styles.statLabel}>Biases Detected</Text>
                            </View>
                        </View>
                    </View>

                    {/* Account Details Section */}
                    <View style={styles.detailsSection}>
                        <Text style={styles.sectionTitle}>Account Details</Text>
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons 
                                name="clock-outline" 
                                size={24} 
                                color={colors.accent} 
                            />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Member Since</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(auth.currentUser?.metadata?.creationTime).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons 
                                name="calendar-clock" 
                                size={24} 
                                color={colors.accent} 
                            />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Last Analysis</Text>
                                <Text style={styles.detailValue}>
                                    {stats.lastAnalysis 
                                        ? stats.lastAnalysis.toLocaleDateString()
                                        : 'No analysis yet'
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.historyButton}
                        onPress={() => navigation.navigate('HistoryScreen')}
                    >
                        <MaterialCommunityIcons 
                            name="history" 
                            size={24} 
                            color={colors.white} 
                        />
                        <Text style={styles.historyText}>View Analysis History</Text>
                    </TouchableOpacity>

                    {/* Add extra padding at bottom for logout button */}
                    <View style={{ height: 80 }} />
                </ScrollView>

                <View style={styles.footerContainer}>
                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <MaterialCommunityIcons 
                            name="logout" 
                            size={24} 
                            color={colors.white} 
                        />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: 20,
        backgroundColor: colors.buttonGrey,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.white,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    mainContainer: {
        flex: 1,
        position: 'relative',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileSection: {
        alignItems: 'center',
        marginVertical: 20,
    },
    profilePhotoContainer: {
        marginVertical: 20,
        alignItems: 'center',
    },
    photoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        borderWidth: Platform.OS === 'ios' ? 3 : 0,
        borderColor: colors.accent,
    },
    placeholderWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.buttonGrey,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.accent,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.white,
        marginTop: 10,
    },
    email: {
        fontSize: 16,
        color: colors.mediumGrey,
        marginTop: 5,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.buttonGrey,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginTop: 8,
    },
    badgeText: {
        color: colors.accent,
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
    },
    statsSection: {
        backgroundColor: colors.lightGrey,
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        color: colors.accent,
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        color: colors.mediumGrey,
        fontSize: 14,
        marginTop: 4,
    },
    detailsSection: {
        backgroundColor: colors.lightGrey,
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        marginBottom: 20, // Add bottom margin
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailContent: {
        marginLeft: 12,
    },
    detailLabel: {
        color: colors.mediumGrey,
        fontSize: 12,
    },
    detailValue: {
        color: colors.white,
        fontSize: 16,
        marginTop: 2,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.lightGrey,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.buttonGrey,
        padding: 15,
        borderRadius: 12,
    },
    logoutText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.lightGrey,
        padding: 15,
        borderRadius: 12,
        marginTop: 20,
        marginBottom: 30,
    },
    historyText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    errorText: {
        color: '#FF4444',
        fontSize: 16,
        marginTop: 10,
        textAlign: 'center',
    },
});