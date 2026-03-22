import { createContext, useState, useEffect } from "react";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser
} from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on app load
  useEffect(() => {
    const existingUser = getCurrentUser();
    if (existingUser) {
      setUser(existingUser);
    }
    setLoading(false);
  }, []);

  // Wrapped login
  const handleLogin = async (email, password) => {
    const user = await loginUser(email, password);
    setUser(user);
  };

  // Wrapped register
  const handleRegister = async (data) => {
    const user = await registerUser(data);
    setUser(user);
  };

  // Wrapped logout
  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        handleLogin,
        handleRegister,
        handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};