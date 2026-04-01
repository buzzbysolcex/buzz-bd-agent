// Contact Discovery — gsd-browser + dev-browser + DexScreener
// Discovers email addresses for token project teams
// 3-source verification before marking as verified

const { execSync } = require('child_process');
const { getDB } = require('../../db');
const { addContact, verifyContact } = require('./outreach-engine');

function db() { return getDB(); }

// Extract emails from a URL using gsd-browser
function scrapeEmailsFromUrl(url) {
  try {
    const result = execSync(
      `gsd-browser navigate "${url}" --json 2>/dev/null && ` +
      `gsd-browser extract --schema '{"emails":{"_selector":"a[href^=mailto:]","_all":true},"contact_links":{"_selector":"a[href*=contact],a[href*=team],a[href*=about]","_all":true}}' --json 2>/dev/null`,
      { timeout: 30000, encoding: 'utf-8' }
    );
    return JSON.parse(result);
  } catch (e) {
    return { emails: [], contact_links: [] };
  }
}

// Extract emails using dev-browser (existing contact screener)
function scrapeWithDevBrowser(url) {
  try {
    const result = execSync(
      `dev-browser --headless <<'EOF'
const page = await browser.getPage("contact-discovery");
await page.goto("${url}", { waitUntil: "domcontentloaded", timeout: 15000 });
const data = await page.evaluate(() => {
  const emails = [];
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    emails.push(a.href.replace('mailto:', '').split('?')[0]);
  });
  const text = document.body.innerText;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
  const found = text.match(emailRegex) || [];
  return [...new Set([...emails, ...found])];
});
console.log(JSON.stringify(data));
EOF`,
      { timeout: 30000, encoding: 'utf-8' }
    );
    return JSON.parse(result.trim());
  } catch (e) {
    return [];
  }
}

// Full contact discovery pipeline for a token
async function discoverContacts(tokenAddress, chain, dexScreenerData = {}) {
  const contacts = [];

  // Source 1: DexScreener socials
  if (dexScreenerData.website) {
    const scraped = scrapeEmailsFromUrl(dexScreenerData.website);
    if (scraped.emails) {
      for (const email of scraped.emails) {
        const href = typeof email === 'string' ? email : email?.href || '';
        const cleanEmail = href.replace('mailto:', '').split('?')[0].trim();
        if (cleanEmail && cleanEmail.includes('@')) {
          addContact(tokenAddress, chain, 'email', cleanEmail, 'website');
          contacts.push({ method: 'email', value: cleanEmail, source: 'website' });
        }
      }
      // Check subpages (/about, /team, /contact)
      for (const link of (scraped.contact_links || [])) {
        const subUrl = typeof link === 'string' ? link : link?.href || '';
        if (subUrl && subUrl.startsWith('http')) {
          const subScraped = scrapeEmailsFromUrl(subUrl);
          for (const email of (subScraped.emails || [])) {
            const href = typeof email === 'string' ? email : email?.href || '';
            const cleanEmail = href.replace('mailto:', '').split('?')[0].trim();
            if (cleanEmail && cleanEmail.includes('@')) {
              addContact(tokenAddress, chain, 'email', cleanEmail, 'website-subpage');
              contacts.push({ method: 'email', value: cleanEmail, source: 'website-subpage' });
            }
          }
        }
      }
    }
  }

  // Source 2: dev-browser deep scrape
  if (dexScreenerData.website) {
    const devEmails = scrapeWithDevBrowser(dexScreenerData.website);
    for (const email of devEmails) {
      if (email && email.includes('@')) {
        addContact(tokenAddress, chain, 'email', email, 'dev-browser');
        contacts.push({ method: 'email', value: email, source: 'dev-browser' });
      }
    }
  }

  // Source 3: Twitter handle (as fallback — not for DM, for public reply)
  if (dexScreenerData.twitter) {
    addContact(tokenAddress, chain, 'twitter', dexScreenerData.twitter, 'dexscreener');
    contacts.push({ method: 'twitter', value: dexScreenerData.twitter, source: 'dexscreener' });
  }

  // Source 4: Telegram group
  if (dexScreenerData.telegram) {
    addContact(tokenAddress, chain, 'telegram', dexScreenerData.telegram, 'dexscreener');
    contacts.push({ method: 'telegram', value: dexScreenerData.telegram, source: 'dexscreener' });
  }

  // Auto-verify emails found in 2+ sources
  const emailCounts = {};
  for (const c of contacts) {
    if (c.method === 'email') {
      emailCounts[c.value] = (emailCounts[c.value] || 0) + 1;
    }
  }
  for (const [email, count] of Object.entries(emailCounts)) {
    if (count >= 2) {
      const contact = db().prepare(`
        SELECT id FROM outreach_contacts
        WHERE token_address = ? AND contact_value = ? AND verified = 0
      `).get(tokenAddress, email);
      if (contact) verifyContact(contact.id);
    }
  }

  return contacts;
}

module.exports = { discoverContacts, scrapeEmailsFromUrl, scrapeWithDevBrowser };
