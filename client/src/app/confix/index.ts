export const HOST_API =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://host.docker.internal:3010"
    : "http://localhost:3010");

export const HOST_API_QR =
  process.env.NEXT_PUBLIC_SOCKET_QR_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://qrsmart-api:8000"
    : "http://localhost:8000");
