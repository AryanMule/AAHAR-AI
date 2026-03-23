import { OB_DIETS } from "./data";

function Step2({ form, setForm }) {

  const selectSensitivity = (level) => {
    setForm(prev => ({ ...prev, sensitivityLevel: level }));
  };

  const toggleDiet = (id) => {
    setForm(prev => {
      const exists = prev.dietPreferences.includes(id);

      return {
        ...prev,
        dietPreferences: exists
          ? prev.dietPreferences.filter(d => d !== id)
          : [...prev.dietPreferences, id]
      };
    });
  };

  return (
    <div>
      <h3 className="mb-4 font-semibold text-lg">Sensitivity</h3>

      <div className="flex gap-2 mb-6">
        {["strict", "moderate", "mild"].map(level => (
          <button
            key={level}
            onClick={() => selectSensitivity(level)}
            className={`px-4 py-2 border rounded ${
              form.sensitivityLevel === level
                ? "bg-blue-500 text-white"
                : ""
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <h3 className="mb-4 font-semibold text-lg">Diet Preferences</h3>

      <div className="flex flex-wrap gap-2">
        {OB_DIETS.map(d => (
          <button
            key={d.id}
            onClick={() => toggleDiet(d.id)}
            className={`px-3 py-2 border rounded ${
              form.dietPreferences.includes(d.id)
                ? "bg-green-500 text-white"
                : ""
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Step2;