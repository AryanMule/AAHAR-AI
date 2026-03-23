import { OB_MEDICAL } from "./data";

function Step3({ form, setForm }) {

  const toggleMedical = (id) => {
    setForm(prev => {
      const exists = prev.medicalConditions.includes(id);

      return {
        ...prev,
        medicalConditions: exists
          ? prev.medicalConditions.filter(m => m !== id)
          : [...prev.medicalConditions, id]
      };
    });
  };

  return (
    <div>
      <h3 className="mb-4 font-semibold text-lg">Medical Conditions</h3>

      <div className="flex flex-wrap gap-2 mb-6">
        {OB_MEDICAL.map(m => (
          <button
            key={m.id}
            onClick={() => toggleMedical(m.id)}
            className={`px-3 py-2 border rounded ${
              form.medicalConditions.includes(m.id)
                ? "bg-purple-500 text-white"
                : ""
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <h3 className="mb-3 font-semibold">Emergency Contact</h3>

      <input
        type="text"
        placeholder="Name"
        className="w-full mb-2 p-2 border rounded"
        onChange={(e) =>
          setForm(prev => ({
            ...prev,
            emergencyContact: {
              ...prev.emergencyContact,
              name: e.target.value
            }
          }))
        }
      />

      <input
        type="text"
        placeholder="Phone"
        className="w-full p-2 border rounded"
        onChange={(e) =>
          setForm(prev => ({
            ...prev,
            emergencyContact: {
              ...prev.emergencyContact,
              phone: e.target.value
            }
          }))
        }
      />
    </div>
  );
}

export default Step3;