/**
 * API module for food logging application.
 * Handles communication with LLM for parsing and Nutrition API for data.
 */

// System prompt for the LLM to enforce strict JSON output
const SYSTEM_PROMPT = `
You are a nutrition assistant. Your task is to extract food items and their quantities from a natural language description.
The input may be in any language (e.g., Vietnamese, Spanish, etc.), but your output must ALWAYS be in English.
Translate all food names and units into English.
Output STRICT JSON only. No markdown formatting, no explanations.
The output format must be an array of objects:
[
  { "item_name": "string in English", "quantity": "string containing number and English unit" }
]
Example input: "Tôi đã ăn 2 quả trứng gà và 1 bát cơm"
Example output: [{"item_name": "chicken egg", "quantity": "2"}, {"item_name": "cooked rice", "quantity": "1 bowl"}]
If the quantity is not specified, estimate a standard serving size or use "1 serving".
`;

/**
 * Parses a natural language meal description into structured data using an LLM.
 * We will use Google Gemini API for this example, or a generic structure if the user prefers another.
 * The prompt implies a generic "LLM API", so we will implement a standard fetch to a likely endpoint
 * (e.g., OpenAI or Gemini) but since the user provides the key, we'll assume a standard OpenAI-compatible chat completion format
 * as that is the most common interface, or specifically Gemini if requested.
 *
 * Given "LLM API Key" usually implies OpenAI or similar, I will default to OpenAI Chat Completion format
 * but keep it generic enough.
 */
export async function parseMeal(description, apiKey) {
  if (!apiKey) throw new Error("LLM API Key is required.");

  // Assumption: User provides an OpenAI-compatible key.
  // We will use the OpenAI Chat Completions endpoint.
  const endpoint = "https://api.openai.com/v1/chat/completions";

  try {
    const response = await axios.post(
      endpoint,
      {
        model: "gpt-3.5-turbo", // Or gpt-4, user choice but 3.5 is faster/cheaper
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: description },
        ],
        temperature: 0.0,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const content = response.data.choices[0].message.content;

    // Attempt to parse JSON. Handle potential markdown code blocks if the LLM slips up.
    const cleanContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("LLM API Error:", error);
    if (error.response && error.response.data && error.response.data.error) {
      throw new Error(`LLM Error: ${error.response.data.error.message}`);
    }
    throw new Error("Failed to parse meal description with LLM. Please check your API key and try again.");
  }
}

/**
 * Fetches nutrition data for a list of items using a Nutrition API.
 * We will use the CalorieNinjas API.
 * To avoid multiple API calls, we will join the queries into a single string.
 * CalorieNinjas supports natural language queries with multiple items (e.g., "1 apple and 2 eggs").
 */
export async function fetchNutrition(items, config) {
  const { provider, apiKey, appId, appKey } = config;

  if (provider === "calorieninjas") {
    if (!apiKey) throw new Error("CalorieNinjas API Key is required.");
    return fetchFromCalorieNinjas(items, apiKey);
  } else if (provider === "nutritionix") {
    if (!appId || !appKey)
      throw new Error("Nutritionix App ID and App Key are required.");
    return fetchFromNutritionix(items, appId, appKey);
  } else {
    throw new Error("Invalid nutrition provider selected.");
  }
}

async function fetchFromCalorieNinjas(items, apiKey) {
  const endpoint = "https://api.calorieninjas.com/v1/nutrition";
  const query = items
    .map((item) => `${item.quantity || ""} ${item.item_name}`)
    .join(", ");

  try {
    const response = await axios.get(endpoint, {
      params: { query: query },
      headers: { "X-Api-Key": apiKey },
    });

    return (response.data.items || []).map((result) => ({
      name: result.name,
      found: true,
      calories: result.calories,
      protein_g: result.protein_g,
      fat_total_g: result.fat_total_g,
      carbohydrates_total_g: result.carbohydrates_total_g,
      sugar_g: result.sugar_g,
      fiber_g: result.fiber_g,
      sodium_mg: result.sodium_mg,
      potassium_mg: result.potassium_mg,
      cholesterol_mg: result.cholesterol_mg,
      serving_size_g: result.serving_size_g,
    }));
  } catch (error) {
    console.error("CalorieNinjas API Error:", error);
    throw new Error("Failed to fetch data from CalorieNinjas.");
  }
}

async function fetchFromNutritionix(items, appId, appKey) {
  const endpoint = "https://trackapi.nutritionix.com/v2/natural/nutrients";
  const query = items
    .map((item) => `${item.quantity || ""} ${item.item_name}`)
    .join(", ");

  try {
    const response = await axios.post(
      endpoint,
      { query: query },
      {
        headers: {
          "x-app-id": appId,
          "x-app-key": appKey,
          "Content-Type": "application/json",
        },
      },
    );

    return (response.data.foods || []).map((food) => ({
      name: food.food_name,
      found: true,
      calories: food.nf_calories,
      protein_g: food.nf_protein,
      fat_total_g: food.nf_total_fat,
      carbohydrates_total_g: food.nf_total_carbohydrate,
      sugar_g: food.nf_sugars,
      fiber_g: food.nf_dietary_fiber,
      sodium_mg: food.nf_sodium,
      potassium_mg: food.nf_potassium,
      cholesterol_mg: food.nf_cholesterol,
      serving_size_g: food.serving_weight_grams,
    }));
  } catch (error) {
    console.error("Nutritionix API Error:", error);
    if (error.response && error.response.status === 404) {
      return []; // No foods found
    }
    throw new Error(
      "Failed to fetch data from Nutritionix. Please check your credentials.",
    );
  }
}
