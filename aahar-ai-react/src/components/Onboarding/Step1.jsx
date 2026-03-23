import { OB_ALLERGENS } from "./data";

function Step1({ form, setForm }) {
  const toggleAllergy = (id) => {
    setForm(prev => {
      const exists = prev.allergies.includes(id);

      return {
        ...prev,
        allergies: exists
          ? prev.allergies.filter(a => a !== id)
          : [...prev.allergies, id]
      };
    });
  };

  return (
    <div>
      <h3 className="mb-4 font-semibold text-lg">Select Allergies</h3>

      <div className="grid grid-cols-2 gap-3">
        {OB_ALLERGENS.map(a => (
          <button
            key={a.id}
            onClick={() => toggleAllergy(a.id)}
            className={`p-3 border rounded-lg flex items-center gap-2 ${
              form.allergies.includes(a.id)
                ? "bg-red-500 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <span>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Step1;