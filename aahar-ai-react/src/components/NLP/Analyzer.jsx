import { useState, useContext } from "react";
import { analyzeText } from "../../services/nlpService";
import { AuthContext } from "../../context/AuthContext";
import AllergenCard from "./AllergenCard";
function Analyzer() {
  const { user } = useContext(AuthContext);

  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;

    setLoading(true);
    const data = await analyzeText(input, user);
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-4">
        🔬 Ingredient Analyzer
      </h1>

      {/* INPUT BOX */}
      <div className="bg-white p-4 rounded-xl shadow mb-4">
        <textarea
          className="w-full border p-3 rounded mb-3 focus:outline-none"
          rows={4}
          placeholder="Paste ingredient list here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button
          onClick={handleAnalyze}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Analyze
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-center py-6">
          <p className="animate-pulse text-gray-500">
            🤖 Analyzing ingredients...
          </p>
        </div>
      )}

      {/* RESULTS */}
      {result && !loading && (
        <div className="space-y-4">

          {/* SUMMARY */}
          <div className="bg-white p-4 rounded-xl shadow">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">Summary</h2>

              <span className={`text-xs px-2 py-1 rounded ${
                result.source === "ai"
                  ? "bg-green-100 text-green-600"
                  : "bg-yellow-100 text-yellow-600"
              }`}>
                {result.source === "ai" ? "AI" : "Fallback"}
              </span>
            </div>

            <p>{result.summary}</p>
          </div>

          {/* ALLERGEN CARDS */}
          <div className="space-y-3">
            {result.allergens.length > 0 ? (
              result.allergens.map((a, i) => (
                <AllergenCard key={i} allergen={a} />
              ))
            ) : (
              <div className="bg-green-100 text-green-700 p-3 rounded">
                ✅ No allergens detected
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default Analyzer;