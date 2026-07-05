import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  name: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  login: (name: string, email: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lc_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("lc_user");
      }
    }
  }, []);

  const login = (name: string, email: string) => {
    const u = { name, email };
    localStorage.setItem("lc_user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("lc_user");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}