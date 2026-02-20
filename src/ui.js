import { parseMeal, fetchNutrition } from "./src/api.js";
import { initialState, ACTIONS, reducer } from "./src/state.js";

const { useState, useReducer, useEffect } = React;

function ConfigPanel({ state, dispatch }) {
  const handleChange = (field, value) => {
    dispatch({ type: ACTIONS.SET_CONFIG, field, value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LLM API Key (OpenAI)</label>
          <input
            type="password"
            value={state.llmApiKey}
            onChange={(e) => handleChange("llmApiKey", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
            placeholder="sk-..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nutrition API Key (CalorieNinjas)</label>
          <input
            type="password"
            value={state.nutritionApiKey}
            onChange={(e) => handleChange("nutritionApiKey", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
            placeholder="Key..."
          />
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <input
          type="checkbox"
          id="showMicros"
          checked={state.showMicros}
          onChange={(e) => dispatch({ type: ACTIONS.TOGGLE_MICROS, value: e.target.checked })}
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <label htmlFor="showMicros" className="ml-2 block text-sm text-gray-900">
          Show Micronutrients
        </label>
      </div>
    </div>
  );
}

function UserInput({ state, dispatch }) {
  const handleAnalyze = async () => {
    if (!state.llmApiKey || !state.nutritionApiKey) {
      dispatch({ type: ACTIONS.SET_ERROR, value: "Please provide both API keys in the configuration panel." });
      return;
    }
    if (!state.inputDescription.trim()) {
      dispatch({ type: ACTIONS.SET_ERROR, value: "Please enter a meal description." });
      return;
    }

    dispatch({ type: ACTIONS.START_LOADING });

    try {
      // 1. Data Extraction (LLM) only
      const items = await parseMeal(state.inputDescription, state.llmApiKey);

      if (!items || !Array.isArray(items)) {
        throw new Error("Invalid response from LLM. Please try again.");
      }

      // 2. Go to Verification
      dispatch({ type: ACTIONS.SET_PARSED_ITEMS, items });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, value: error.message });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">What did you eat?</h2>
      <textarea
        value={state.inputDescription}
        onChange={(e) => dispatch({ type: ACTIONS.SET_INPUT, value: e.target.value })}
        className="w-full p-4 border border-gray-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition mb-4"
        placeholder="I had a large bowl of oatmeal with blueberries and a glass of milk..."
        disabled={state.isLoading}
      />
      <button
        onClick={handleAnalyze}
        disabled={state.isLoading}
        className={`w-full py-3 px-6 rounded-lg text-white font-bold transition duration-200 ${state.isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-blue-600"}`}
      >
        {state.isLoading ? "Analyzing..." : "Analyze Meal"}
      </button>
    </div>
  );
}

function VerificationPanel({ state, dispatch }) {
  const handleConfirm = async () => {
    dispatch({ type: ACTIONS.START_LOADING });
    try {
      // 3. Nutritional Querying (Batched)
      const nutritionResults = await fetchNutrition(state.parsedItems, state.nutritionApiKey);
      dispatch({ type: ACTIONS.SET_RESULTS, items: nutritionResults });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, value: error.message });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-yellow-400">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Verify Items</h2>
      <p className="mb-4 text-gray-600">The AI identified the following items. Is this correct?</p>

      <ul className="mb-6 space-y-2 bg-gray-50 p-4 rounded-lg">
        {state.parsedItems.map((item, idx) => (
          <li key={idx} className="flex items-center text-gray-800">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            <span className="font-semibold mr-2">{item.quantity}</span>
            <span>{item.item_name}</span>
          </li>
        ))}
      </ul>

      <div className="flex space-x-4">
        <button
          onClick={() => dispatch({ type: ACTIONS.BACK_TO_INPUT })}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
          disabled={state.isLoading}
        >
          Back / Edit
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition"
          disabled={state.isLoading}
        >
          {state.isLoading ? "Fetching Data..." : "Confirm & Calculate"}
        </button>
      </div>
    </div>
  );
}

function OutputDisplay({ state, dispatch }) {
  if (state.isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="spinner"></div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm relative" role="alert">
        <p className="font-bold">Error</p>
        <p>{state.error}</p>
        <button
          onClick={() => dispatch({ type: ACTIONS.BACK_TO_INPUT })}
          className="absolute top-2 right-2 text-red-700 hover:text-red-900 font-bold"
        >
          ✕
        </button>
      </div>
    );
  }

  if (state.step !== "RESULTS" || !state.foodItems || state.foodItems.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Aggregated Totals */}
      <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-secondary">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Total Nutrition</h2>
          <button onClick={() => dispatch({ type: ACTIONS.CLEAR_RESULTS })} className="text-sm text-blue-500 hover:underline">
            Start Over
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-primary">{state.totals.calories}</div>
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Calories</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{state.totals.protein}g</div>
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Protein</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">{state.totals.fat}g</div>
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Fat</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-500">{state.totals.carbs}g</div>
            <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Carbs</div>
          </div>
        </div>
      </div>

      {/* Individual Items - Responsive Grid Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Item Breakdown</h3>

        <div className="min-w-full">
          {/* Header - Hidden on small screens, visible on md+ */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 text-sm font-bold text-gray-500 uppercase pb-2 border-b">
            <div className="col-span-4">Item</div>
            <div className="col-span-2 text-center">Calories</div>
            <div className="col-span-2 text-center">Protein</div>
            <div className="col-span-2 text-center">Fat</div>
            <div className="col-span-2 text-center">Carbs</div>
          </div>

          <div className="space-y-4 md:space-y-0 text-sm">
            {state.foodItems.map((item, index) => (
              <div key={index} className="flex flex-col md:grid md:grid-cols-12 md:gap-4 py-3 border-b last:border-0 hover:bg-gray-50 transition">
                {/* Name */}
                <div className="col-span-4 font-semibold text-gray-800 flex items-center mb-2 md:mb-0">
                  <span className="capitalize">{item.name}</span>
                  {!item.found && <span className="ml-2 text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded">(Not found)</span>}
                </div>

                {item.found ? (
                  <>
                    {/* Mobile Labels included for stacking, hidden on desktop */}
                    <div className="col-span-2 text-center flex justify-between md:justify-center">
                      <span className="md:hidden text-gray-500">Calories:</span>
                      <span className="font-bold text-gray-800">{item.calories}</span>
                    </div>
                    <div className="col-span-2 text-center flex justify-between md:justify-center">
                      <span className="md:hidden text-gray-500">Protein:</span>
                      <span className="font-bold text-gray-800">{item.protein_g}g</span>
                    </div>
                    <div className="col-span-2 text-center flex justify-between md:justify-center">
                      <span className="md:hidden text-gray-500">Fat:</span>
                      <span className="font-bold text-gray-800">{item.fat_total_g}g</span>
                    </div>
                    <div className="col-span-2 text-center flex justify-between md:justify-center">
                      <span className="md:hidden text-gray-500">Carbs:</span>
                      <span className="font-bold text-gray-800">{item.carbohydrates_total_g}g</span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-8 text-gray-400 italic text-sm">No data available</div>
                )}

                {/* Micros Row (Full width) */}
                {state.showMicros && item.found && (
                  <div className="col-span-12 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div>
                      <span className="font-medium">Sugar:</span> {item.sugar_g}g
                    </div>
                    <div>
                      <span className="font-medium">Fiber:</span> {item.fiber_g}g
                    </div>
                    <div>
                      <span className="font-medium">Sodium:</span> {item.sodium_mg}mg
                    </div>
                    <div>
                      <span className="font-medium">Potassium:</span> {item.potassium_mg}mg
                    </div>
                    <div>
                      <span className="font-medium">Cholesterol:</span> {item.cholesterol_mg}mg
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2 tracking-tight">Food Logger AI</h1>
        <p className="text-gray-500">Track your nutrition with natural language</p>
      </header>

      <ConfigPanel state={state} dispatch={dispatch} />

      {/* Conditional Rendering Steps */}
      {state.step === "INPUT" && <UserInput state={state} dispatch={dispatch} />}
      {state.step === "VERIFY" && <VerificationPanel state={state} dispatch={dispatch} />}

      <OutputDisplay state={state} dispatch={dispatch} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
