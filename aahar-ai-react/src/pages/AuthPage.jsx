import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function AuthPage() {
  const { handleLogin, handleRegister } = useContext(AuthContext);

  const [isLogin, setIsLogin] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        await handleLogin(form.email, form.password);
      } else {
        await handleRegister(form);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isLogin ? "Login" : "Register"}
        </h2>

        {error && (
          <div className="text-red-500 mb-3 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit}>

          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              className="w-full mb-3 p-2 border rounded"
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full mb-3 p-2 border rounded"
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full mb-3 p-2 border rounded"
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />

          <button className="w-full bg-blue-600 text-white p-2 rounded">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p className="text-sm mt-4 text-center">
          {isLogin ? "No account?" : "Already have an account?"}
          <span
            className="text-blue-600 cursor-pointer ml-1"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Register" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;