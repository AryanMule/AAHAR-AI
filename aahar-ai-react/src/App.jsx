import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  return user ? <Home /> : <AuthPage />;
}

export default App;