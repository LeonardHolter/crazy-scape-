import FirecrawlApp from "@mendable/firecrawl-js";

const TARGET_URL =
  "https://synergybb.com/businesses-for-sale/?_listing_location_multi=arizona%2Ccalifornia%2Cflorida%2Cillinois%2Cmassachusetts%2Cnew-jersey%2Cnew-mexico%2Cnew-york%2Coklahoma%2Cpennsylvania%2Cindiana&_listing_industry_multi=services&_listing_net_cash_flow=746000.00%2C3021000.00";

export interface ScrapedListing {
  url: string;
  title: string;
  asking_price: string | null;
  annual_revenue: string | null;
  net_cash_flow: string | null;
  description: string | null;
}

export async function scrapeListings(): Promise<ScrapedListing[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || apiKey === "your-firecrawl-api-key-here") {
    throw new Error("FIRECRAWL_API_KEY is not configured");
  }

  const app = new FirecrawlApp({ apiKey });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await app.scrapeUrl(TARGET_URL, {
    formats: ["markdown"],
    waitFor: 3000,
  });

  const markdown: string = result.markdown ?? result.data?.markdown ?? "";
  if (!markdown) {
    throw new Error("Firecrawl returned no markdown content");
  }

  return parseListings(markdown);
}

function parseListings(markdown: string): ScrapedListing[] {
  const listings: ScrapedListing[] = [];

  // Split on listing boundaries — each listing links to synergybb.com/listings/
  const blocks = markdown.split(/(?=\[.*?\]\(https:\/\/synergybb\.com\/listings\/)/);

  for (const block of blocks) {
    const titleMatch = block.match(/\[([^\]]+)\]\((https:\/\/synergybb\.com\/listings\/[^\s)]+)\)/);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const url = titleMatch[2].trim();

    if (title === "Learn More") continue;

    // Work with text AFTER the title link to avoid picking up amounts from title
    const afterTitle = block.slice(block.indexOf(url) + url.length);

    const allPrices: string[] = [];
    const priceRegex = /\$([\d,]{4,}(?:\.\d+)?)/g;
    let m;
    while ((m = priceRegex.exec(afterTitle)) !== null) {
      allPrices.push(m[0]);
    }

    let annual_revenue: string | null = null;
    let net_cash_flow: string | null = null;

    const revenueMatch = afterTitle.match(/Annual\s*Revenue:\s*\*?\*?\$?([\d,]+(?:\.\d+)?)/i);
    const cashFlowMatch = afterTitle.match(/Net\s*Cash\s*Flow:\s*\*?\*?\$?([\d,]+(?:\.\d+)?)/i);

    if (revenueMatch) annual_revenue = `$${revenueMatch[1]}`;
    if (cashFlowMatch) net_cash_flow = `$${cashFlowMatch[1]}`;

    let asking_price: string | null = null;
    for (const p of allPrices) {
      const normalized = p.replace(/[$,]/g, "");
      const revNorm = annual_revenue?.replace(/[$,]/g, "") ?? "";
      const cfNorm = net_cash_flow?.replace(/[$,]/g, "") ?? "";
      if (normalized !== revNorm && normalized !== cfNorm) {
        asking_price = p;
        break;
      }
    }

    let description: string | null = null;
    // Try structured description first, then fall back to first prose paragraph after financials
    const descMatch = afterTitle.match(/(?:Business\s*(?:Highlights?|Overview)|(?:This|An?)\s+(?:business|company|unique|exceptional|opportunity|highly|well))\s*[:\s]*([\s\S]*?)(?=\n\n|- \[|$)/i);
    if (descMatch) {
      description = descMatch[0].replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    } else {
      // Fall back: grab first sentence-like block after the financial data
      const fallback = afterTitle.match(/\n\n([A-Z][^[\n]{40,})/);
      if (fallback) {
        description = fallback[1].replace(/\s+/g, " ").trim().slice(0, 300);
      }
    }

    if (title && url) {
      listings.push({ url, title, asking_price, annual_revenue, net_cash_flow, description });
    }
  }

  return listings;
}
