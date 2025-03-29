import { GoogleGenAI } from "@google/genai";

// Bias categories constant
const BIAS_CATEGORIES = {
  GENDER: {
    type: 'Gender Bias',
    examples: ['he/she only', 'mankind', 'chairman'],
    severity: 'high'
  },
  RACIAL: {
    type: 'Racial Bias',
    examples: ['minority groups', 'ethnic background'],
    severity: 'high'
  },
  AGE: {
    type: 'Age Discrimination',
    examples: ['young', 'old', 'senior'],
    severity: 'medium'
  },
  SOCIOECONOMIC: {
    type: 'Socioeconomic Bias',
    examples: ['poor', 'wealthy', 'privileged'],
    severity: 'medium'
  },
  LANGUAGE: {
    type: 'Language Bias',
    examples: ['native speaker', 'fluent only'],
    severity: 'medium'
  }
};

export const analyzeBias = async (genAI, text) => {
    try {
        const prompt = `
            Analyze this legal document for potential biases. For each bias found:
            1. Identify the type of bias
            2. Quote the specific text
            3. Calculate confidence score (0-100%)
            4. Suggest neutral alternatives

            Format as:
            Type: [bias type]
            Text: "[quoted text]"
            Confidence: [X]%
            Alternative: [suggestion]
            
            Text to analyze: ${text}
        `;

        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt
        });

        return response.text;
    } catch (error) {
        console.error('Bias Analysis Error:', error);
        throw error;
    }
};

export const getBiasSeverityColor = (severity) => {
  switch (severity.toLowerCase()) {
    case 'high':
      return '#FF4444';
    case 'medium':
      return '#FFBB33';
    case 'low':
      return '#00C851';
    default:
      return '#4A90E2';
  }
};

export default {
  analyzeBias,
  BIAS_CATEGORIES,
  getBiasSeverityColor
};