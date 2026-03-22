import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Home() {
  const { user, handleLogout } = useContext(AuthContext);

  return (
    <div>
      <h1>Welcome {user.name}</h1>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default Home;