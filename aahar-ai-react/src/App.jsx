import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import Onboarding from "./components/Onboarding/Onboarding";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  // ❌ Not logged in
  if (!user) return <AuthPage />;

  // ❌ Logged in but no onboarding
  if (!user.allergies || user.allergies.length === 0) {
    return <Onboarding />;
  }

  // ✅ Fully ready
  return <Home />;
}

export default App;