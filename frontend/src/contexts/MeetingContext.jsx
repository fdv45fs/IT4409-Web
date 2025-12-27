import { createContext, useContext, useState } from "react";

const MeetingContext = createContext();

export function MeetingProvider({ children }) {
  const [isInMeeting, setIsInMeeting] = useState(false);

  return (
    <MeetingContext.Provider value={{ isInMeeting, setIsInMeeting }}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeetingContext() {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error("useMeetingContext must be used within MeetingProvider");
  }
  return context;
}
