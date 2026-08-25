import { axiosClient } from "@/lib/axios";
import { CurrentUserResponse } from "../type";

export const authService = {
  login(data: { username: string; password: string }) {
    return axiosClient.post("/auth/login", data);
  },
  logout() {
    return axiosClient.post("/auth/logout");
  },
  getCurrentUser() {
    return axiosClient
      .get<CurrentUserResponse>("/auth/me")
      .then((res) => res.data);
  },
};
