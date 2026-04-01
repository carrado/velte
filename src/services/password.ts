import { apiClient } from "@/lib/api";

export const passwordApi = {
  sendOTP: async (data: any) => {
    const response = await apiClient("/auth/getPasswordOTP", {
      method: "POST",
      data,
    });
    return response;
  },

  resetPassword: async (data: any) => {
    const response = await apiClient("/auth/reset-password", {
      method: "POST",
      data,
    });
    return response;
  },
};
