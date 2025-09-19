import { createContext } from "react";
import type { User } from "firebase/auth";

export type AuthContextType = {
  fbUser: User | null | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthCtx = createContext<AuthContextType | undefined>(undefined);
