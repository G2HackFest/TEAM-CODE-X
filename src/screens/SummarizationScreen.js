import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

const colors = {
    background: '#000000',
    white: '#FFFFFF',
    lightGrey: '#404040',
    mediumGrey: '#808080',
    buttonGrey: '#333333',
    accent: '#4A90E2',
};

export default function SummarizationScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { summary } = route.params;

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
                <Text style={styles.headerTitle}>Document Summary</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <MaterialCommunityIcons 
                            name="text-box-check" 
                            size={24} 
                            color={colors.accent} 
                        />
                    </View>
                    <Text style={styles.summaryText}>{summary}</Text>
                </View>
            </ScrollView>
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
    summaryContainer: {
        backgroundColor: colors.lightGrey,
        borderRadius: 12,
        padding: 16,
    },
    summaryText: {
        color: colors.white,
        fontSize: 16,
        lineHeight: 24,
        marginTop: 16,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    }
});