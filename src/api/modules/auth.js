import api from "../client";

const DEMO_USER = {
  id: 1,
  email: "admin@dlh.com",
  name: "Administrator",
  role: "admin",
};

const MOCK_TOKEN = "mock-jwt-token-for-local-dev-" + Date.now();

export const authApi = {
  login: async (email, password) => {
    if (email === "admin@dlh.com" && password === "admin") {
      return {
        data: {
          token: MOCK_TOKEN,
          user: DEMO_USER,
        },
      };
    }
    throw new Error("Email atau password salah");
  },

  logout: async () => {
    return { data: { message: "Logged out" } };
  },

  me: async () => {
    return { data: DEMO_USER };
  },
};
