import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { updateCurrentUser } from "../../services/authService";

import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";

function Onboarding() {
  const { user, setUser } = useContext(AuthContext);

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    allergies: [],
    sensitivityLevel: "moderate",
    dietPreferences: [],
    medicalConditions: [],
    emergencyContact: { name: "", phone: "" }
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleFinish = () => {
    if (form.allergies.length === 0) {
      alert("Select at least one allergy");
      return;
    }

    updateCurrentUser(form);
    console.log("Form Data after clicking finish:", form);
    setUser({ ...user, ...form });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-6 rounded-xl w-[500px] shadow">

        <h2 className="text-xl font-bold mb-4">
          Onboarding (Step {step}/3)
        </h2>

        {step === 1 && <Step1 form={form} setForm={setForm} />}
        {step === 2 && <Step2 form={form} setForm={setForm} />}
        {step === 3 && <Step3 form={form} setForm={setForm} />}

        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button onClick={prevStep} className="px-4 py-2 bg-gray-300 rounded">
              Back
            </button>
          )}

          {step < 3 ? (
            <button onClick={nextStep} className="px-4 py-2 bg-blue-600 text-white rounded">
              Next
            </button>
          ) : (
            <button onClick={handleFinish} className="px-4 py-2 bg-green-600 text-white rounded">
              Finish
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default Onboarding;