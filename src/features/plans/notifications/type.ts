export type PlanNotification = {
  id: string;
  type: string;
  data: {
    plan_uuid?: string;
    title?: string;
    date?: string;
    time?: string | null;
    timezone?: string;
  };
  read_at: string | null;
  created_at: string | null;
};

export type NotificationPage = {
  current_page: number;
  data: PlanNotification[];
  last_page: number;
  per_page: number;
  total: number;
};
