import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Analyzer from "../components/NLP/Analyzer";
import CameraScanner from "../components/Scanner/CameraScanner";
function Home() {
  const { user, handleLogout } = useContext(AuthContext);

  return (
    <div>
      <h1>Welcome {user.name}</h1>

      <button onClick={handleLogout}>
        Logout
      </button>
      <h1 className="text-xl font-bold p-4">
        AAHAR AI Dashboard
      </h1>
      <CameraScanner />
      <Analyzer />
    </div>
  );
}

export default Home;