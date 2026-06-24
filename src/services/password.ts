import { api } from "@/lib/api-client";

export const passwordApi = {
  sendOTP: async (data: Record<string, unknown>) => {
    return api.post("/api/auth/getPasswordOTP", data);
  },

  resetPassword: async (data: Record<string, unknown>) => {
    return api.post("/api/auth/reset-password", data);
  },
};
