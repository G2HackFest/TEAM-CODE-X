import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    TouchableOpacity,
    ScrollView,
    ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, firestore } from '../services/firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const colors = {
    background: '#000000',
    white: '#FFFFFF',
    lightGrey: '#404040',
    mediumGrey: '#808080',
    buttonGrey: '#333333',
    accent: '#4A90E2',
};

export default function HistoryScreen() {
    const navigation = useNavigation();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const user = auth.currentUser;
        if (!user) {
            navigation.replace('LoginScreen');
            return;
        }

        try {
            const analysesRef = collection(firestore, 'analyses');
            const userQuery = query(
                analysesRef,
                where('userId', '==', user.uid)
            );

            const querySnapshot = await getDocs(userQuery);
            const userFiles = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                const biasCount = data.biasAnalysis ? 
                    (data.biasAnalysis.match(/Type:/g) || []).length : 0;

                userFiles.push({
                    id: doc.id,
                    fileName: data.originalName || data.fileName,
                    createdAt: data.createdAt?.toDate(),
                    content: data.content,
                    biasAnalysis: data.biasAnalysis,
                    fileType: data.fileType || 'unknown',
                    stats: {
                        biasCount,
                        wordCount: data.content?.split(/\s+/).length || 0,
                        analysisLength: data.content?.length || 0
                    }
                });
            });

            userFiles.sort((a, b) => b.createdAt - a.createdAt);
            setHistory(userFiles);
            
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Unknown date';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFileIcon = (fileType) => {
        switch (fileType?.toLowerCase()) {
            case 'pdf':
                return 'file-pdf-box';
            case 'txt':
                return 'file-document-outline';
            case 'docx':
                return 'file-word';
            default:
                return 'file-outline';
        }
    };

    const renderFileItem = (file) => (
        <TouchableOpacity 
            key={file.id}
            style={styles.fileItem}
        >
            <View style={styles.fileHeader}>
                <MaterialCommunityIcons 
                    name={getFileIcon(file.fileType)}
                    size={24} 
                    color={colors.accent} 
                />
                <View style={styles.fileInfo}>
                    <Text style={styles.fileName}>{file.fileName}</Text>
                    <Text style={styles.fileDate}>{formatDate(file.createdAt)}</Text>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons 
                        name="shield-alert" 
                        size={16} 
                        color="#FF4444" 
                    />
                    <Text style={styles.statValue}>{file.stats.biasCount}</Text>
                    <Text style={styles.statLabel}>Biases</Text>
                </View>

                <View style={styles.statItem}>
                    <MaterialCommunityIcons 
                        name="text" 
                        size={16} 
                        color={colors.accent} 
                    />
                    <Text style={styles.statValue}>{file.stats.wordCount}</Text>
                    <Text style={styles.statLabel}>Words</Text>
                </View>
            </View>

            <View style={styles.contentSection}>
                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => navigation.navigate('SummarizationScreen', { 
                        summary: file.content 
                    })}
                >
                    <Text style={styles.viewButtonText}>View Summary</Text>
                    <MaterialCommunityIcons 
                        name="chevron-right" 
                        size={20} 
                        color={colors.white} 
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => navigation.navigate('BiasScreen', { 
                        biasAnalysis: file.biasAnalysis 
                    })}
                >
                    <Text style={styles.viewButtonText}>View Bias Analysis</Text>
                    <MaterialCommunityIcons 
                        name="chevron-right" 
                        size={20} 
                        color={colors.white} 
                    />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

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
                <Text style={styles.headerTitle}>Analysis History</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    {history.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons 
                                name="file-search" 
                                size={48} 
                                color={colors.mediumGrey} 
                            />
                            <Text style={styles.emptyText}>No analysis history yet</Text>
                        </View>
                    ) : (
                        history.map(file => renderFileItem(file))
                    )}
                </ScrollView>
            )}
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
        marginLeft: 16,
    },
    backButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: colors.mediumGrey,
        fontSize: 16,
        marginTop: 16,
    },
    fileItem: {
        backgroundColor: colors.buttonGrey,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    fileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    fileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    fileName: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    fileDate: {
        color: colors.mediumGrey,
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: colors.white,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4,
    },
    statLabel: {
        color: colors.mediumGrey,
        fontSize: 12,
        marginTop: 2,
    },
    contentSection: {
        gap: 8,
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 8,
    },
    viewButtonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: colors.mediumGrey,
        marginVertical: 8,
    }
});