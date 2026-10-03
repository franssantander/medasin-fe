import { axiosClient } from "@/lib/axios";
import type { AuthMessageResponse, CurrentUserResponse } from "@/features/auth/type";
import type { ChangePasswordRequest, DeleteAccountRequest } from "../types";

export const profileService = {
  uploadImage(image: File) {
    const data = new FormData();
    data.append("image", image);
    return axiosClient.post<CurrentUserResponse>("/profile/image", data, {
      timeout: 120000,
    }).then((response) => response.data);
  },
  removeImage() {
    return axiosClient.delete<CurrentUserResponse>("/profile/image").then((response) => response.data);
  },
  changePassword(data: ChangePasswordRequest) {
    return axiosClient.patch<AuthMessageResponse>("/profile/password", data).then((response) => response.data);
  },
  deleteAccount(data: DeleteAccountRequest) {
    return axiosClient.delete<AuthMessageResponse>("/profile", { data }).then((response) => response.data);
  },
};
