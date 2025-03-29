import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Image
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { GoogleGenAI } from "@google/genai";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { analyzeBias } from '../utils/biasDetection';
import BiasAnalysis from '../components/BiasAnalysis';
import * as Print from 'expo-print';
import { useNavigation } from '@react-navigation/native';
import { auth, firestore } from '../services/firebaseConfig';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

const colors = {
  background: '#000000',
  white: '#FFFFFF',
  lightGrey: '#404040',
  mediumGrey: '#808080',
  buttonGrey: '#333333',
  accent: '#4A90E2',
};

const { width } = Dimensions.get('window');

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: "AIzaSyCOwLzVqD-ymtm1JhAg-YYnbFG9x7ZAoiA" });

const formatAnalysisText = (text) => {
    return text
        // Handle headers
        .replace(/##\s*(.*?)\n/g, '$1:\n')  // Convert ## headers to text with colon
        .replace(/\*\*(.*?)\*\*/g, '$1')     // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1')         // Remove italic markdown
        .replace(/`(.*?)`/g, '$1')           // Remove code formatting
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Convert links to text only
        .replace(/^\s*[-*+]\s/gm, '• ')      // Convert list items to bullet points
        .replace(/^\s*\d+\.\s/gm, '')        // Remove numbered list markers
        .split('\n')                          // Split into lines
        .filter(line => line.trim())          // Remove empty lines
        .join('\n\n');                        // Join with proper spacing
};

const generateFileName = (originalName) => {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-');
    const fileNumber = Math.floor(Math.random() * 1000);
    const extension = originalName ? originalName.split('.').pop() : 'txt';
    
    return `file${fileNumber}_${timestamp}.${extension}`;
};

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [biasAnalysis, setBiasAnalysis] = useState(null);
  const [documentName, setDocumentName] = useState(null);
  const [analysisType, setAnalysisType] = useState(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [history, setHistory] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
      const fetchProfilePhoto = async () => {
          try {
              const user = auth.currentUser;
              if (!user) return;

              const userDocRef = doc(firestore, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                  const userData = userDoc.data();
                  setProfilePhoto(userData.photoURL || null);
              }
          } catch (error) {
              console.error('Error fetching profile photo:', error);
          }
      };

      fetchProfilePhoto();
  }, []);

  useEffect(() => {
      fetchHistory();
  }, []);

  const fetchHistory = async () => {
      const user = auth.currentUser;
      if (!user) return;

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
                  stats: {
                      biasCount,
                      wordCount: data.content?.split(/\s+/).length || 0,
                  }
              });
          });

          setHistory(userFiles);
      } catch (error) {
          console.error('Error fetching history:', error);
      } finally {
          setDashboardLoading(false);
      }
  };

  const calculateDashboardStats = () => {
      const totalAnalyses = history.length;
      const totalBiases = history.reduce((sum, file) => sum + file.stats.biasCount, 0);
      const totalWords = history.reduce((sum, file) => sum + file.stats.wordCount, 0);

      return { totalAnalyses, totalBiases, totalWords };
  };

  const processWithGemini = async (text, documentDetails) => {
    try {
        if (!currentUser) {
            alert('Please login to analyze documents');
            navigation.navigate('LoginScreen');
            return;
        }

        setLoading(true);
        setIsAnalyzed(false);
        
        // Generate analysis using Gemini
        const [summaryResponse, biasResponse] = await Promise.all([
            genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: `Summarize this legal document: ${text}`
            }),
            analyzeBias(genAI, text)
        ]);

        const formattedSummary = formatAnalysisText(summaryResponse.text);
        const formattedBias = formatAnalysisText(biasResponse);

        // Calculate overall bias score
        const biasLines = formattedBias.split('\n');
        const confidenceScores = biasLines
            .filter(line => line.includes('Confidence:'))
            .map(line => parseInt(line.replace('Confidence: ', '').replace('%', '')));
        
        const averageConfidence = confidenceScores.length > 0 
            ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
            : 0;

        setAnalysis(formattedSummary);
        setBiasAnalysis(formattedBias);
        setIsAnalyzed(true);
        
        // Save to Firestore with document details
        const analysisData = {
            userId: currentUser.uid,
            fileName: documentDetails.name,
            originalName: documentDetails.name,
            fileType: documentDetails.type,
            fileSize: documentDetails.size,
            content: formattedSummary,
            biasAnalysis: formattedBias,
            createdAt: new Date(),
            lastModified: documentDetails.lastModified,
            metadata: {
                size: text.length,
                created: new Date(),
                lastModified: documentDetails.lastModified
            },
            biasConfidence: averageConfidence,
            biasCount: confidenceScores.length
        };

        const docRef = await addDoc(collection(firestore, 'analyses'), analysisData);
        console.log('Analysis saved with ID:', docRef.id);

    } catch (error) {
        console.error('Analysis Error:', error);
        alert('Error analyzing document');
        setIsAnalyzed(false);
    } finally {
        setLoading(false);
    }
  };

  const extractPDFText = async (uri) => {
    // Placeholder function for extracting text from PDF
    // Implement actual PDF text extraction logic here
    return "Extracted text from PDF";
  };

  const handleDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['text/*', 'application/pdf']
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            const selectedDoc = result.assets[0];
            // Extract and store document name first
            const originalName = selectedDoc.name;
            setDocumentName(originalName);

            let text;
            const fileType = originalName.split('.').pop().toLowerCase();

            // Process based on file type
            if (fileType === 'pdf') {
                text = await extractPDFText(selectedDoc.uri);
            } else if (fileType === 'txt') {
                const response = await fetch(selectedDoc.uri);
                text = await response.text();
            } else {
                throw new Error('Unsupported file type');
            }

            if (text) {
                // Store document details in state before analysis
                const documentDetails = {
                    name: originalName,
                    type: fileType,
                    size: selectedDoc.size,
                    lastModified: new Date(),
                };
                
                // Pass document details to processWithGemini
                await processWithGemini(text, documentDetails);
            } else {
                throw new Error('Could not extract text from document');
            }
        }
    } catch (error) {
        console.error('Document selection error:', error);
        alert('Error processing document: ' + error.message);
        setDocumentName(null);
    }
  };

  const renderAnalysisButtons = () => {
    return (
        <View style={styles.widgetContainer}>
            <TouchableOpacity 
                style={[styles.widgetButton, styles.summaryWidget]}
                onPress={() => navigation.navigate('SummarizationScreen', { summary: analysis })}
            >
                <MaterialCommunityIcons 
                    name="text-box-check" 
                    size={32} 
                    color={colors.white} 
                />
                <View style={styles.widgetContent}>
                    <Text style={styles.widgetTitle}>Summary</Text>
                    <Text style={styles.widgetSubtitle}>View document analysis</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.widgetButton, styles.biasWidget]}
                onPress={() => navigation.navigate('BiasScreen', { biasAnalysis })}
            >
                <MaterialCommunityIcons 
                    name="shield-alert" 
                    size={32} 
                    color={colors.white} 
                />
                <View style={styles.widgetContent}>
                    <Text style={styles.widgetTitle}>Bias Check</Text>
                    <Text style={styles.widgetSubtitle}>View detected biases</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                    setIsAnalyzed(false);
                    setAnalysis(null);
                    setBiasAnalysis(null);
                    setDocumentName(null);
                }}
            >
                <MaterialCommunityIcons 
                    name="upload-multiple" 
                    size={24} 
                    color={colors.white} 
                />
                <Text style={styles.backButtonText}>Analyze Another Document</Text>
            </TouchableOpacity>
        </View>
    );
  };

  const renderDashboard = () => {
      const { totalAnalyses, totalBiases, totalWords } = calculateDashboardStats();

      return (
          <View style={styles.dashboardContainer}>
              <View style={styles.dashboardItem}>
                  <MaterialCommunityIcons 
                      name="file-document-outline" 
                      size={32} 
                      color={colors.accent} 
                  />
                  <Text style={styles.dashboardValue}>{totalAnalyses}</Text>
                  <Text style={styles.dashboardLabel}>Total Analyses</Text>
              </View>

              <View style={styles.dashboardItem}>
                  <MaterialCommunityIcons 
                      name="shield-alert" 
                      size={32} 
                      color="#FF4444" 
                  />
                  <Text style={styles.dashboardValue}>{totalBiases}</Text>
                  <Text style={styles.dashboardLabel}>Total Biases</Text>
              </View>

              <View style={styles.dashboardItem}>
                  <MaterialCommunityIcons 
                      name="text" 
                      size={32} 
                      color={colors.accent} 
                  />
                  <Text style={styles.dashboardValue}>{totalWords}</Text>
                  <Text style={styles.dashboardLabel}>Total Words</Text>
              </View>
          </View>
      );
  };

  const renderContent = () => {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Analyzing document...</Text>
                <Text style={styles.subLoadingText}>This may take a moment</Text>
            </View>
        );
    }

    return (
        <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {!isAnalyzed && (
                <>
                    {renderDashboard()}
                    <View style={styles.uploadContainer}>
                        <TouchableOpacity 
                            style={styles.uploadButton}
                            onPress={handleDocument}
                        >
                            <View style={styles.uploadContent}>
                                <MaterialCommunityIcons 
                                    name="file-upload-outline" 
                                    size={48} 
                                    color="rgba(255, 255, 255, 0.8)" 
                                />
                                <Text style={styles.uploadTitle}>Choose a file</Text>
                                <Text style={styles.uploadSubtitle}>or drag and drop</Text>
                                <Text style={styles.uploadHint}>PDF, TXT files supported</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {documentName && (
                <View style={styles.documentInfoContainer}>
                    <MaterialCommunityIcons 
                        name="file-document-outline" 
                        size={20} 
                        color={colors.accent} 
                    />
                    <Text style={styles.documentName}>{documentName}</Text>
                </View>
            )}

            {isAnalyzed && analysis && biasAnalysis && (
                <View style={styles.analysisContainer}>
                    <Text style={styles.completedText}>Analysis Complete!</Text>
                    {renderAnalysisButtons()}
                </View>
            )}
            <View style={styles.bottomSpacing} />
        </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Legal Document Analysis</Text>
            <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('ProfileScreen')}
            >
                {profilePhoto ? (
                    <Image
                        source={{ uri: profilePhoto }}
                        style={styles.profilePhotoButton}
                    />
                ) : (
                    <MaterialCommunityIcons 
                        name="account-circle" 
                        size={28} 
                        color={colors.white} 
                    />
                )}
            </TouchableOpacity>
        </View>

        <View style={styles.content}>
            {renderContent()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  profileButton: {
    padding: 5,
  },
  profilePhotoButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1,
    borderColor: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  uploadContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  uploadButton: {
    width: '90%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  uploadContent: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  uploadSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 4,
  },
  uploadHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    marginTop: 8,
  },
  fileName: {
    color: colors.white,
    fontSize: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 16,
  },
  analysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    opacity: 1,
  },
  summaryButton: {
    backgroundColor: colors.accent,
  },
  biasButton: {
    backgroundColor: '#FF4444',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  subLoadingText: {
    color: colors.mediumGrey,
    fontSize: 14,
    marginTop: 8,
  },
  widgetContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    paddingHorizontal: 20,
  },
  widgetButton: {
    width: '90%',
    height: 120,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    backgroundColor: '#000000',
  },
  summaryWidget: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
  },
  biasWidget: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
  },
  widgetContent: {
    marginLeft: 16,
    flex: 1,
  },
  widgetTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  widgetSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  analysisContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  completedText: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 4,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dashboardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.buttonGrey,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  dashboardItem: {
    alignItems: 'center',
  },
  dashboardValue: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  dashboardLabel: {
    color: colors.mediumGrey,
    fontSize: 14,
    marginTop: 4,
  },
  bottomSpacing: {
    height: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  documentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  documentName: {
    color: colors.white,
    fontSize: 16,
    marginLeft: 8,
  },
});
