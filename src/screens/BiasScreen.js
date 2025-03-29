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
import BiasAnalysis from '../components/BiasAnalysis';

const colors = {
    background: '#000000',
    white: '#FFFFFF',
    lightGrey: '#404040',
    mediumGrey: '#808080',
    buttonGrey: '#333333',
    accent: '#4A90E2',
};

function BiasScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { biasAnalysis } = route.params || {};

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
                <Text style={styles.headerTitle}>Bias Analysis</Text>
            </View>

            <ScrollView style={styles.content}>
                <BiasAnalysis biasData={biasAnalysis} />
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
});

export default BiasScreen;