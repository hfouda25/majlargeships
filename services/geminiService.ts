import { GoogleGenAI } from "@google/genai";
import { SearchResult, ClassSocietyData } from "../types";

const getApiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your Netlify environment.");
  }
  return new GoogleGenAI({ apiKey });
};


const parseJSON = (text: string) => {
  try {
    // Locate the first opening brace and the last closing brace
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      // Extract just the JSON object part
      const jsonString = text.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonString);
    }

    // Fallback: Attempt to clean markdown code blocks if the substring method fails
    const cleanText = text.replace(/```json\n|\n```/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse Gemini JSON response", e);
    console.debug("Raw response text:", text);
    return null;
  }
};

export const searchShipData = async (shipName: string, imoNumber: string): Promise<SearchResult | null> => {
  const ai = getApiClient();

  const prompt = `
    Conduct a comprehensive search for the merchant vessel "${shipName}" with IMO number "${imoNumber}".
    
    I need you to find the following specific information using Google Search:
    1. Ship Particulars: Gross Tonnage (GRT), Year Built, Vessel Type, Flag State.
    2. Dimensions & Build: 
       - Length Overall (LOA) in meters.
       - Beam (Breadth) in meters.
       - Summer Draft in meters.
       - Ship Builder (Shipyard Name).
    3. Current Location: Look for latest AIS position reports (Latitude/Longitude or Area).
    4. Classification Society: Which society classes this ship?
    5. Class Society Link: Find the direct URL to this ship's page on the Classification Society's public register (e.g., DNV Vessel Register, ABS Record, BV VeriSTAR, ClassNK, NK-Ships, KR, LR Class Direct). If a direct ship link isn't found, provide the main search page for that specific Class Society.
    6. Sanction Status: Check if this specific ship/IMO appears on OFAC, UN, or EU sanction lists summaries available online.
    7. Survey & Certificates: 
       - Try to find the "Last Special Survey" date or "Last Annual Survey" date.
       - Look for the status of its major certificates (e.g., "Valid", "Suspended", "Withdrawn", "Unknown").
    
    Return the result strictly as a valid JSON object with the following schema, do not add markdown formatting or extra text:
    {
      "name": "${shipName}",
      "imo": "${imoNumber}",
      "grossTonnage": 0, // Number only
      "yearBuilt": "YYYY",
      "type": "Vessel Type",
      "flag": "Flag State",
      "lengthOverall": "e.g. 299.9 m",
      "beam": "e.g. 48.2 m",
      "draft": "e.g. 14.5 m",
      "builder": "Shipyard Name",
      "location": "Current location summary",
      "classSociety": "Class Society Name",
      "classSocietyUrl": "URL to ship page or class society home",
      "sanctionInfo": "Summary of any sanction findings or 'None found'",
      "isSanctioned": false, // boolean based on findings
      "lastSurveyDate": "Date or 'Unknown'",
      "certificateStatus": "Status summary or 'Unknown'",
      "description": "A brief 2 sentence summary of the ship."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // schema is not supported with search grounding yet in some contexts, so we rely on prompt instruction for JSON.
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = parseJSON(text);
    return data as SearchResult;

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export const analyzeClassPerformance = async (className: string): Promise<ClassSocietyData | null> => {
  const ai = getApiClient();

  const prompt = `
    I need to find the latest Port State Control (PSC) performance rating for the classification society: "${className}".

    Please search the following specific official reports/lists from their respective websites:
    1. **Paris MoU Performance List**: Look for the most recent "Paris MoU Annual Report" containing the "White, Grey and Black List". Determine if "${className}" is White, Grey, or Black listed.
    2. **Tokyo MoU Performance List**: Look for the most recent "Tokyo MoU Annual Report" or "Performance of Recognized Organizations" list. Determine if "${className}" is White, Grey, or Black listed.
    3. **USCG Safety Compliance**: Look for the "US Coast Guard Annual Report" on Port State Control. Check the "Class Society Performance" table. Determine if "${className}" is on the "Targeted" list or has "QUALSHIP 21" status.

    If exact current year data is not found, use the most recent available year (e.g., 2023 or 2024).

    Return strictly a JSON object with the following structure (no markdown):
    {
      "id": "${Date.now()}",
      "name": "${className}",
      "pscData": [
        { "mou": "Paris MoU", "listStatus": "e.g. White List", "performanceLevel": "High" },
        { "mou": "Tokyo MoU", "listStatus": "e.g. White List", "performanceLevel": "High" },
        { "mou": "USCG", "listStatus": "e.g. Non-Targeted", "performanceLevel": "High" }
      ],
      "trend": "Up" | "Down" | "Steady",
      "trendReason": "Brief explanation of the performance status across these three regimes.",
      "lastUpdated": "${new Date().toISOString()}"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text;
    if (!text) return null;
    return parseJSON(text) as ClassSocietyData;
  } catch (error) {
    console.error("Gemini Class Analysis Error:", error);
    throw error;
  }
};