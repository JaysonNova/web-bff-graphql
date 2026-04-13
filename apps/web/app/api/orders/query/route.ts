import { jsonNoStore } from "@/src/lib/response";

export async function POST() {
  return jsonNoStore(
    {
      message: "ORDERS_QUERY_ENDPOINT_REMOVED"
    },
    {
      status: 410
    }
  );
}
