import { getAllListings, getListingStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listings = getAllListings();
    const stats = getListingStats();
    return Response.json({ listings, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
