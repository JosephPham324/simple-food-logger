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
          <label className="block text-sm font-medium text-gray-700 mb-1">Nutrition API Provider</label>
          <select
            value={state.nutritionProvider}
            onChange={(e) => handleChange("nutritionProvider", e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition bg-white"
          >
            <option value="calorieninjas">CalorieNinjas</option>
            <option value="nutritionix">Nutritionix</option>
          </select>
        </div>
        {state.nutritionProvider === "calorieninjas" ? (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">CalorieNinjas API Key</label>
            <input
              type="password"
              value={state.nutritionApiKey}
              onChange={(e) => handleChange("nutritionApiKey", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="Key..."
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nutritionix App ID</label>
              <input
                type="text"
                value={state.nutritionixAppId}
                onChange={(e) => handleChange("nutritionixAppId", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="App ID..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nutritionix App Key</label>
              <input
                type="password"
                value={state.nutritionixAppKey}
                onChange={(e) => handleChange("nutritionixAppKey", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="App Key..."
              />
            </div>
          </>
        )}
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
    const hasLlmKey = !!state.llmApiKey;
    const hasNutritionKeys =
      state.nutritionProvider === "calorieninjas"
        ? !!state.nutritionApiKey
        : !!state.nutritionixAppId && !!state.nutritionixAppKey;

    if (!hasLlmKey || !hasNutritionKeys) {
      dispatch({
        type: ACTIONS.SET_ERROR,
        value: "Please provide both API keys in the configuration panel.",
      });
      return;
    }
    if (!state.inputDescription.trim()) {
      dispatch({
        type: ACTIONS.SET_ERROR,
        value: "Please enter a meal description.",
      });
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
      const nutritionConfig = {
        provider: state.nutritionProvider,
        apiKey: state.nutritionApiKey,
        appId: state.nutritionixAppId,
        appKey: state.nutritionixAppKey,
      };
      const nutritionResults = await fetchNutrition(
        state.parsedItems,
        nutritionConfig,
      );
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
  const [copyStatus, setCopyStatus] = useState("Copy for Sheets");

  const handleCopy = () => {
    const headers = ["Item", "Calories", "Protein (g)", "Fat (g)", "Carbs (g)"];
    const rows = state.foodItems.map((item) => [
      item.name,
      item.calories || 0,
      item.protein_g || 0,
      item.fat_total_g || 0,
      item.carbohydrates_total_g || 0,
    ]);

    const tsvContent = [headers, ...rows].map((row) => row.join("\t")).join("\n");

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus("Copy for Sheets"), 2000);
    });
  };

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
          <div className="flex space-x-4 items-center">
            <button
              onClick={handleCopy}
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 transition font-medium flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copyStatus}
            </button>
            <button onClick={() => dispatch({ type: ACTIONS.CLEAR_RESULTS })} className="text-sm text-blue-500 hover:underline">
              Start Over
            </button>
          </div>
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

      {/* Individual Items - Semantic Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Item Breakdown</h3>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Calories</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Protein</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Fat</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Carbs</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {state.foodItems.map((item, index) => (
              <React.Fragment key={index}>
                <tr className="hover:bg-gray-50 transition">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="capitalize font-semibold text-gray-800">{item.name}</span>
                      {!item.found && <span className="ml-2 text-[10px] text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded">Not found</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-gray-800">
                    {item.found ? item.calories : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-gray-800">
                    {item.found ? `${item.protein_g}g` : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-gray-800">
                    {item.found ? `${item.fat_total_g}g` : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-gray-800">
                    {item.found ? `${item.carbohydrates_total_g}g` : "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => dispatch({ type: ACTIONS.REMOVE_FOOD_ITEM, index })}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Remove item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {state.showMicros && item.found && (
                  <tr className="bg-gray-50/50">
                    <td colSpan="6" className="px-4 py-2">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-gray-500 uppercase tracking-tight">
                        <span><span className="font-bold">Sugar:</span> {item.sugar_g}g</span>
                        <span><span className="font-bold">Fiber:</span> {item.fiber_g}g</span>
                        <span><span className="font-bold">Sodium:</span> {item.sodium_mg}mg</span>
                        <span><span className="font-bold">Potassium:</span> {item.potassium_mg}mg</span>
                        <span><span className="font-bold">Cholesterol:</span> {item.cholesterol_mg}mg</span>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
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
