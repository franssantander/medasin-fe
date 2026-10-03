export type ChangePasswordRequest = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export type DeleteAccountRequest = {
  confirmation: "DELETE";
};

export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
