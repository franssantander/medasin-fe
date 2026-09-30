import type { AppFontFamily } from "@/features/settings/types";

export type CurrentUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  username: string;
  font_family?: AppFontFamily;
};

export type CurrentUserResponse = {
  data: CurrentUser;
  status: number;
  message: string;
};
