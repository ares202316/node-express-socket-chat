import Pusher from "pusher";

export const pusher = new Pusher({
  appId: "TU_APP_ID",
  key: "TU_KEY",
  secret: "TU_SECRET",
  cluster: "TU_CLUSTER",
  useTLS: true,
});

