/**
 * State management for the Food Logger.
 * Uses a reducer pattern for React.
 */

export const initialState = {
  llmApiKey: "",
  nutritionApiKey: "",
  nutritionProvider: "calorieninjas", // 'calorieninjas' or 'nutritionix'
  nutritionixAppId: "",
  nutritionixAppKey: "",
  showMicros: false,

  inputDescription: "",

  isLoading: false,
  error: null,

  step: "INPUT", // 'INPUT', 'VERIFY', 'RESULTS'
  parsedItems: [], // Intermediate items from LLM
  foodItems: [], // Final items with nutrition data

  totals: {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  },
};

export const ACTIONS = {
  SET_CONFIG: "SET_CONFIG",
  SET_INPUT: "SET_INPUT",
  START_LOADING: "START_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_PARSED_ITEMS: "SET_PARSED_ITEMS",
  SET_RESULTS: "SET_RESULTS",
  CLEAR_RESULTS: "CLEAR_RESULTS", // Resets to INPUT
  BACK_TO_INPUT: "BACK_TO_INPUT", // Keeps input text but goes back
  TOGGLE_MICROS: "TOGGLE_MICROS",
  REMOVE_FOOD_ITEM: "REMOVE_FOOD_ITEM",
};

export function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CONFIG:
      return {
        ...state,
        [action.field]: action.value,
      };
    case ACTIONS.SET_INPUT:
      return {
        ...state,
        inputDescription: action.value,
      };
    case ACTIONS.START_LOADING:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.value,
      };
    case ACTIONS.SET_PARSED_ITEMS:
      return {
        ...state,
        isLoading: false,
        step: "VERIFY",
        parsedItems: action.items,
        error: null,
      };
    case ACTIONS.SET_RESULTS:
      return {
        ...state,
        isLoading: false,
        step: "RESULTS",
        foodItems: action.items,
        totals: calculateTotals(action.items),
      };
    case ACTIONS.CLEAR_RESULTS:
      return {
        ...state,
        step: "INPUT",
        foodItems: [],
        parsedItems: [],
        totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
        error: null,
        // inputDescription: '' // Optional: keep or clear. Let's keep it for easy editing.
      };
    case ACTIONS.BACK_TO_INPUT:
      return {
        ...state,
        step: "INPUT",
        parsedItems: [],
        error: null,
      };
    case ACTIONS.TOGGLE_MICROS:
      return {
        ...state,
        showMicros: action.value,
      };
    case ACTIONS.REMOVE_FOOD_ITEM:
      const updatedFoodItems = state.foodItems.filter((_, idx) => idx !== action.index);
      return {
        ...state,
        foodItems: updatedFoodItems,
        totals: calculateTotals(updatedFoodItems),
      };
    default:
      return state;
  }
}

function calculateTotals(items) {
  const totals = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  };

  items.forEach((item) => {
    if (item.found) {
      totals.calories += item.calories || 0;
      totals.protein += item.protein_g || 0;
      totals.fat += item.fat_total_g || 0;
      totals.carbs += item.carbohydrates_total_g || 0;
    }
  });

  // Round to 1 decimal place
  for (let key in totals) {
    totals[key] = Math.round(totals[key] * 10) / 10;
  }

  return totals;
}
