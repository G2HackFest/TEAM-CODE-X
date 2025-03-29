import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyCOwLzVqD-ymtm1JhAg-YYnbFG9x7ZAoiA';
const genAI = new GoogleGenerativeAI(API_KEY);

export const gemini = {
  async generateText(prompt) {
    try {
      // Use the correct model name
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.0-pro"  // Updated model name
      });
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
};