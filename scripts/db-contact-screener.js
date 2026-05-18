// Contact Screening Script — dev-browser
// Extracts: team info, social links, email, follower count, member count, last post date
// Usage: dev-browser --headless --timeout 45 < scripts/db-contact-screener.js
//
// Set these before running:
// const PROJECT_URL = "https://example.com";
// const TWITTER_HANDLE = "ExampleToken";
// const TELEGRAM_LINK = "https://t.me/example";

const PROJECT_URL = "https://pepe.vip"; // Test with PEPE
const TWITTER_HANDLE = "pepecoineth";
const TELEGRAM_LINK = ""; // Leave empty if unknown

const results = {
  project_url: PROJECT_URL,
  twitter_handle: TWITTER_HANDLE,
  telegram_link: TELEGRAM_LINK,
  website: null,
  twitter: null,
  telegram: null,
  contact_template: null,
  scraped_at: new Date().toISOString(),
};

const page = await browser.getPage("contact-screener");

// === STEP 1: Project Website ===
if (PROJECT_URL) {
  try {
    await page.goto(PROJECT_URL);
    await new Promise((r) => setTimeout(r, 3000));

    results.website = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const html = document.body.innerHTML.toLowerCase();

      // Extract emails
      const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/g;
      const emails = [...new Set(bodyText.match(emailRegex) || [])];

      // Extract social links
      const socialLinks = {};
      const links = Array.from(document.querySelectorAll("a[href]"));
      links.forEach((a) => {
        const href = a.href.toLowerCase();
        if (href.includes("twitter.com") || href.includes("x.com"))
          socialLinks.twitter = a.href;
        if (href.includes("t.me") || href.includes("telegram"))
          socialLinks.telegram = a.href;
        if (href.includes("discord.gg") || href.includes("discord.com"))
          socialLinks.discord = a.href;
        if (href.includes("github.com")) socialLinks.github = a.href;
        if (href.includes("medium.com")) socialLinks.medium = a.href;
        if (href.includes("linkedin.com")) socialLinks.linkedin = a.href;
      });

      // Look for team info
      const teamKeywords = [
        "team",
        "about us",
        "founders",
        "our team",
        "who we are",
      ];
      const hasTeamPage = teamKeywords.some((k) => html.includes(k));

      // Look for documentation
      const docKeywords = ["docs", "documentation", "whitepaper", "litepaper"];
      const hasDocs = docKeywords.some((k) => html.includes(k));

      // Extract page meta
      const description =
        document.querySelector('meta[name="description"]')?.content || null;

      return {
        title: document.title,
        description,
        emails: emails.filter(
          (e) => !e.includes("example") && !e.includes("test"),
        ),
        socialLinks,
        hasTeamPage,
        hasDocs,
        wordCount: bodyText.split(/\s+/).length,
      };
    });
  } catch (e) {
    results.website = { error: "Failed to load: " + e.message };
  }
}

// === STEP 2: Twitter Profile ===
if (TWITTER_HANDLE) {
  try {
    // Use Nitter or public profile (Twitter blocks scraping, try public view)
    await page.goto(`https://x.com/${TWITTER_HANDLE}`);
    await new Promise((r) => setTimeout(r, 4000));

    results.twitter = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Try to extract follower count
      const followerMatch = bodyText.match(
        /([\d,.]+[KMB]?)\s*(?:Followers|followers)/,
      );
      const followingMatch = bodyText.match(
        /([\d,.]+[KMB]?)\s*(?:Following|following)/,
      );

      // Bio/description
      const bioEl = document.querySelector('[data-testid="UserDescription"]');

      // Last tweet date
      const timeEls = Array.from(document.querySelectorAll("time"));
      const lastPostDate =
        timeEls.length > 0 ? timeEls[0].getAttribute("datetime") : null;

      // Verified badge
      const isVerified =
        !!document.querySelector('[data-testid="icon-verified"]') ||
        bodyText.includes("Verified account");

      return {
        handle: window.location.pathname.replace("/", ""),
        followers: followerMatch ? followerMatch[1] : null,
        following: followingMatch ? followingMatch[1] : null,
        bio: bioEl ? bioEl.textContent.trim() : null,
        lastPostDate,
        isVerified,
        loaded: !bodyText.includes("Something went wrong"),
      };
    });
  } catch (e) {
    results.twitter = { error: "Failed to load: " + e.message };
  }
}

// === STEP 3: Telegram Group ===
if (TELEGRAM_LINK) {
  try {
    // Use Telegram preview (t.me renders a preview without login)
    await page.goto(TELEGRAM_LINK);
    await new Promise((r) => setTimeout(r, 3000));

    results.telegram = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Member count
      const memberMatch = bodyText.match(
        /([\d,. ]+)\s*(?:members|subscribers)/i,
      );

      return {
        title:
          document.querySelector(".tgme_page_title")?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.content,
        description:
          document
            .querySelector(".tgme_page_description")
            ?.textContent?.trim() ||
          document.querySelector('meta[property="og:description"]')?.content,
        members: memberMatch ? memberMatch[1].trim() : null,
        type: bodyText.includes("subscribers") ? "channel" : "group",
      };
    });
  } catch (e) {
    results.telegram = { error: "Failed to load: " + e.message };
  }
}

// === STEP 4: Build contact template ===
const emails = results.website?.emails || [];
const socials = results.website?.socialLinks || {};

results.contact_template = {
  // Phase 4.2 format from BD Screening Workflow
  project_name: results.website?.title || TWITTER_HANDLE,
  contact_email: emails[0] || "NOT FOUND",
  twitter: socials.twitter || `https://x.com/${TWITTER_HANDLE}`,
  telegram: socials.telegram || TELEGRAM_LINK || "NOT FOUND",
  discord: socials.discord || "NOT FOUND",
  github: socials.github || "NOT FOUND",
  website: PROJECT_URL,
  team_visible: results.website?.hasTeamPage || false,
  docs_available: results.website?.hasDocs || false,
  twitter_followers: results.twitter?.followers || "UNKNOWN",
  telegram_members: results.telegram?.members || "UNKNOWN",
  last_active: results.twitter?.lastPostDate || "UNKNOWN",
  screening_score: null, // Filled by scoring engine
  notes: [],
};

// Add screening notes
if (!results.website?.hasTeamPage)
  results.contact_template.notes.push("No visible team page");
if (!results.website?.hasDocs)
  results.contact_template.notes.push("No documentation found");
if (emails.length === 0)
  results.contact_template.notes.push("No email found on website");
if (results.twitter?.loaded === false)
  results.contact_template.notes.push("Twitter profile failed to load");

console.log(JSON.stringify(results, null, 2));
