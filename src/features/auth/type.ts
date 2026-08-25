export type CurrentUser = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  username: string;
};

export type CurrentUserResponse = {
  data: CurrentUser;
  status: number;
  message: string;
};
