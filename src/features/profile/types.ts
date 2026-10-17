export type ChangePasswordRequest = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

/** Deletion needs the current password, or an emailed code for accounts created with Google. */
export type DeleteAccountRequest = {
  confirmation: "DELETE";
  current_password?: string;
  otp?: string;
};

export type DeletionCodeStatus = {
  sent: boolean;
  otp_expires_in: number;
  resend_after: number;
};

export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
