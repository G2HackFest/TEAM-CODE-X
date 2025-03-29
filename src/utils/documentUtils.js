import RNFS from 'react-native-fs';

export const extractTextFromDocument = async (document) => {
  try {
    // For demo purposes, reading as plain text
    // In production, you'd want to handle different file types differently
    const content = await RNFS.readFile(document.uri, 'utf8');
    return content;
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error('Could not extract text from document');
  }
};