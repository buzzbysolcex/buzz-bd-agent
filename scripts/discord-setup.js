const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '1487647664647438476';

const CATEGORIES = [
  {
    name: 'GETTING STARTED',
    channels: [
      { name: 'welcome', topic: 'Welcome to BuzzBD — Zero-Human Exchange Listing Company' },
      { name: 'how-it-works', topic: 'Scoring methodology — 11 factors, dual-gate, tri-source verification' },
      { name: 'faq', topic: 'Common questions about BuzzBD and SolCex listings' }
    ]
  },
  {
    name: 'LISTING INTELLIGENCE',
    channels: [
      { name: 'weekly-report', topic: 'Sunday Listing Intelligence Report — published weekly' },
      { name: 'token-scores', topic: 'Live token scores from the Buzz scoring engine' },
      { name: 'market-intel', topic: 'AIBTC signal approvals and market observations' }
    ]
  },
  {
    name: 'FOR PROJECTS',
    channels: [
      { name: 'get-listed', topic: 'Apply for a SolCex listing — DM @BuzzBySolCex or post here' },
      { name: 'listing-status', topic: 'Public tracking of listing pipeline status' },
      { name: 'support', topic: 'Project support and scoring questions' }
    ]
  },
  {
    name: 'FOR BUILDERS',
    channels: [
      { name: 'els-1', topic: 'ELS-1 Listing Standard discussion — buzzbd.ai/proposal' },
      { name: 'api-access', topic: 'Buzz API documentation and integration help' },
      { name: 'open-source', topic: 'Open-source contributions and Agent Skills' }
    ]
  },
  {
    name: 'COMMUNITY',
    channels: [
      { name: 'announcements', topic: 'Deployments, milestones, partnerships' }
      // #general already exists
    ]
  }
];

const WELCOME_MSG = `🐝 **Welcome to BuzzBD**

The world's first Zero-Human Exchange Listing Company.

**What we do:**
• Score tokens across 29 intel sources with honest tri-source verification
• 4 smart contracts on Base mainnet (ScoreStorage, ListingOracle, ListingEscrow, BuzzReputation)
• ARIA v2 autonomous intelligence feed
• 50-agent MiroFish simulation engine

**Links:**
• Website: https://buzzbd.ai
• Report: https://buzzbd.ai/report
• Proposal: https://buzzbd.ai/proposal
• Twitter: https://x.com/BuzzBySolCex
• API: https://api.buzzbd.ai

**Want your token scored?**
Post in #get-listed or DM @BuzzBySolCex on Twitter.

*If your project scores 70+, we want to talk.*`;

const ANNOUNCE_MSG = `🚀 **Sprint Day 42 Complete**

4 contracts deployed to Base mainnet today.
ARIA v2 intelligence feed wired with 4 sources.
7-day AIBTC signal streak.
$125+ signal revenue.

The Listing Protocol is on-chain. Service starts now.

**Contracts:**
• ScoreStorage: \`0xbf81...388Fb\`
• ListingOracle: \`0xc584...4463\`
• ListingEscrow: \`0xc77F...3ED\`
• BuzzReputation: \`0x723B...2747\``;

async function setup() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  await client.login(TOKEN);
  console.log(`Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);
  console.log(`Guild: ${guild.name} (${guild.memberCount} members)`);

  const created = [];

  for (const cat of CATEGORIES) {
    // Create category
    console.log(`\nCreating category: ${cat.name}`);
    const category = await guild.channels.create({
      name: cat.name,
      type: ChannelType.GuildCategory
    });
    created.push({ type: 'category', name: cat.name, id: category.id });

    // Create channels under category
    for (const ch of cat.channels) {
      console.log(`  Creating #${ch.name}`);
      const channel = await guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: ch.topic
      });
      created.push({ type: 'channel', name: ch.name, id: channel.id, category: cat.name });

      // Post messages to specific channels
      if (ch.name === 'welcome') {
        await channel.send(WELCOME_MSG);
        console.log('    Posted welcome message');
      }
      if (ch.name === 'announcements') {
        await channel.send(ANNOUNCE_MSG);
        console.log('    Posted announcement');
      }
      if (ch.name === 'how-it-works') {
        await channel.send(`**Buzz Scoring Methodology**

Every token is evaluated across **11 factors in 4 categories** (max 100 points):

| Category | Weight |
|----------|--------|
| Market Structure | 30 pts |
| Safety | 30 pts |
| Social | 20 pts |
| Quality | 20 pts |

**Dual-Gate Verification:** Both fundamentals (≥42/70) AND market (≥18/30) must pass independently.

**8 Screening Rules:** FDV gap, honeypot kill, liquidity cross-ref, stablecoin exclusion, phantom token cap, security penalty, market missing, dual-gate.

**Current pipeline:** 256 tokens tracked. 0 score HOT (85+). That's honest scoring working correctly.

Learn more: https://buzzbd.ai/report`);
        console.log('    Posted methodology');
      }
      if (ch.name === 'get-listed') {
        await channel.send(`**Get Your Token Scored**

Post your token's contract address and chain here. Buzz will score it across 29 intel sources with tri-source verification.

**What we need:**
• Contract address
• Chain (Solana, Base, BSC, ETH, Arbitrum)
• Project website (optional)
• Twitter handle (optional)

**What you get:**
• 0-100 composite score across 11 factors
• Dual-gate verification result
• Classification: HOT / QUALIFIED / WATCH / SKIP
• If you score 70+, we initiate the listing conversation

*No paid fast-tracks. No relationship overrides. Same engine for every token.*`);
        console.log('    Posted get-listed info');
      }
    }
  }

  console.log('\n=== SETUP COMPLETE ===');
  console.log(JSON.stringify(created, null, 2));
  client.destroy();
}

setup().catch(err => { console.error('Setup failed:', err.message); process.exit(1); });
