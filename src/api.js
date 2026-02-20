/**
 * API module for food logging application.
 * Handles communication with LLM for parsing and Nutrition API for data.
 */

// System prompt for the LLM to enforce strict JSON output
const SYSTEM_PROMPT = `
You are a nutrition assistant. Your task is to extract food items and their quantities from a natural language description.
Output STRICT JSON only. No markdown formatting, no explanations.
The output format must be an array of objects:
[
  { "item_name": "string", "quantity": "string containing number and unit" }
]
Example input: "I ate a large banana and a cup of coffee"
Example output: [{"item_name": "large banana", "quantity": "1"}, {"item_name": "coffee", "quantity": "1 cup"}]
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
export async function fetchNutrition(items, apiKey) {
  if (!apiKey) throw new Error("Nutrition API Key is required.");

  const endpoint = "https://api.calorieninjas.com/v1/nutrition";

  // Construct a single query string from all items.
  // Example: "1 apple, 2 eggs, 1 slice toast"
  const query = items
    .map((item) => `${item.quantity || ""} ${item.item_name}`)
    .join(", ");

  try {
    const response = await axios.get(endpoint, {
      params: { query: query },
      headers: { "X-Api-Key": apiKey },
    });

    const apiItems = response.data.items || [];

    // Map the API results back to our requested structure.
    // Note: The API might return a slightly different name or splitting.
    // We will return exactly what the API returns as "found items".
    return apiItems.map((result) => ({
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
    console.error("Nutrition API Error:", error);
    throw new Error(
      "Failed to fetch nutrition data. Please check your API key and try again.",
    );
  }
}
