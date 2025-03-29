import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BiasAnalysis = ({ biasData }) => {
  if (!biasData) return null;

  // Helper function to determine icon for bias type
  const getBiasIcon = (biasType) => {
    switch (biasType.toLowerCase()) {
      case 'gender bias':
        return 'gender-male-female';
      case 'racial bias':
        return 'account-group';
      case 'age discrimination':
        return 'account-clock';
      case 'socioeconomic bias':
        return 'cash';
      case 'language bias':
        return 'text';
      default:
        return 'alert-circle';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons 
          name="shield-alert" 
          size={24} 
          color="#FF6B6B" 
        />
        <Text style={styles.title}>Bias Analysis</Text>
      </View>

      <View style={styles.content}>
        {typeof biasData === 'string' ? (
          <Text style={styles.text}>{biasData}</Text>
        ) : (
          Object.entries(biasData).map(([type, details], index) => (
            <View key={index} style={styles.biasItem}>
              <View style={styles.biasHeader}>
                <MaterialCommunityIcons 
                  name={getBiasIcon(type)} 
                  size={20} 
                  color="#4A90E2" 
                />
                <Text style={styles.biasType}>{type}</Text>
              </View>
              <Text style={styles.biasDetails}>{details}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  content: {
    gap: 16,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  biasItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  biasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  biasType: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  biasDetails: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 28,
  },
});

export default BiasAnalysis;