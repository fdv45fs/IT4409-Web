import { createContext, useContext, useState } from "react";

const UserProfileContext = createContext();

export function UserProfileProvider({ children }) {
  const [profileUser, setProfileUser] = useState(null);

  const openProfile = (user) => {
    setProfileUser(user);
  };

  const closeProfile = () => {
    setProfileUser(null);
  };

  return (
    <UserProfileContext.Provider value={{ profileUser, openProfile, closeProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return context;
}
