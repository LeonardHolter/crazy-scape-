import { NextRequest } from "next/server";
import { scrapeListings } from "@/lib/scraper";
import { upsertListing, markMissingListings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Optional: protect cron endpoint with a secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret !== "your-cron-secret-here") {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const listings = await scrapeListings();

    const currentUrls: string[] = [];
    for (const listing of listings) {
      upsertListing(listing);
      currentUrls.push(listing.url);
    }

    // Mark listings not found in this scrape as "gone"
    markMissingListings(currentUrls);

    return Response.json({
      success: true,
      scraped: listings.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
