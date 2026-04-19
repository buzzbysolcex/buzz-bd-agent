/**
 * Unit tests — api/lib/discord-notify.js
 *
 * Run: npx jest api/__tests__/discord-notify.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

// Mock feature-flags — flipped per-test via env var _TEST_FLAG_*
jest.mock("../lib/feature-flags", () => ({
  feature: (name) => process.env["_TEST_FLAG_" + name] === "1",
  allFlags: () => ({}),
  FLAGS: {},
}));

let notify;
let mockFetch;
let tmpDir;
let tmpConfigPath;

function loadNotify() {
  jest.resetModules();
  notify = require("../lib/discord-notify");
  notify._resetCache();
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzz-discord-test-"));
  tmpConfigPath = path.join(tmpDir, "discord-channels.json");
  fs.writeFileSync(
    tmpConfigPath,
    JSON.stringify({
      guild_id: "g1",
      ops_category_id: "c_ops",
      intel_category_id: "c_intel",
      ops: {
        "morning-brief": "ch_morning",
        "daily-report": "ch_daily",
        "kill-switch-log": "ch_ks",
      },
      intel: {
        inbox: { zachxbt: "ch_zxbt", lookonchain: "ch_look" },
        output: { triaged: "ch_triaged", actioned: "ch_actioned" },
      },
    }),
  );

  mockFetch = jest.fn();
  global.fetch = mockFetch;

  process.env.DISCORD_BOT_TOKEN = "test-token";
  process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "1";
  process.env.DISCORD_CHANNEL_CONFIG_PATH = tmpConfigPath;

  loadNotify();
});

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
  delete process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD;
  delete process.env.DISCORD_BOT_TOKEN;
  delete process.env.DISCORD_CHANNEL_CONFIG_PATH;
  jest.resetAllMocks();
});

describe("discord-notify", () => {
  test("no-op when flag off", async () => {
    process.env._TEST_FLAG_DISCORD_OPS_DASHBOARD = "0";
    const res = await notify.send("ops.morning-brief", "hello");
    expect(res).toEqual({ sent: false, reason: "flag_off" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("no-op when token missing", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    const res = await notify.send("ops.morning-brief", "hello");
    expect(res.sent).toBe(false);
    expect(res.reason).toBe("no_token");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("no-op when config missing", async () => {
    process.env.DISCORD_CHANNEL_CONFIG_PATH = "/nonexistent/path.json";
    notify._resetCache();
    const res = await notify.send("ops.morning-brief", "hello");
    expect(res.sent).toBe(false);
    expect(res.reason).toBe("no_config");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("no-op when channelKey unresolved", async () => {
    const res = await notify.send("ops.nonexistent", "hello");
    expect(res.sent).toBe(false);
    expect(res.reason).toBe("no_channel_id");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("resolves ops.morning-brief to correct channel id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: "m1" }),
    });
    const res = await notify.send("ops.morning-brief", "hi");
    expect(res.sent).toBe(true);
    expect(res.messageIds).toEqual(["m1"]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://discord.com/api/v10/channels/ch_morning/messages",
    );
  });

  test("resolves intel.inbox.zachxbt and intel.output.triaged", () => {
    const channels = notify.loadChannels();
    expect(notify.resolveChannelId("intel.inbox.zachxbt", channels)).toBe(
      "ch_zxbt",
    );
    expect(notify.resolveChannelId("intel.output.triaged", channels)).toBe(
      "ch_triaged",
    );
    expect(notify.resolveChannelId("intel.missing.path", channels)).toBeNull();
  });

  test("chunks content > 2000 chars into multiple posts", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: "mX" }),
    });
    const big = "A".repeat(4500);
    const res = await notify.send("ops.morning-brief", big);
    expect(res.sent).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test("chunk helper returns raw slices up to limit", () => {
    expect(notify.chunkContent("abc")).toEqual(["abc"]);
    expect(notify.chunkContent("a".repeat(2500))).toHaveLength(2);
    expect(notify.chunkContent("")).toEqual([""]);
  });

  test("429 rate-limit retries after retry_after", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ retry_after: 0.01 }),
        json: async () => ({ retry_after: 0.01 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "m2" }),
      });
    const res = await notify.send("ops.daily-report", "hi");
    expect(res.sent).toBe(true);
    expect(res.messageIds).toEqual(["m2"]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("non-2xx response returns sent:false with http_NNN reason", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () =>
        JSON.stringify({ code: 50013, message: "Missing Permissions" }),
    });
    const res = await notify.send("ops.kill-switch-log", "hi");
    expect(res.sent).toBe(false);
    expect(res.reason).toBe("http_403");
    expect(res.error).toEqual({
      code: 50013,
      message: "Missing Permissions",
    });
  });

  test("attaches embeds to last chunk only", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: "mE" }),
    });
    const big = "B".repeat(3500);
    await notify.send("ops.morning-brief", big, {
      embeds: [{ title: "Test" }],
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(firstBody.embeds).toBeUndefined();
    expect(secondBody.embeds).toEqual([{ title: "Test" }]);
  });

  test("exception path returns sent:false with reason=exception", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const res = await notify.send("ops.morning-brief", "hi");
    expect(res.sent).toBe(false);
    expect(res.reason).toBe("exception");
    expect(res.error).toBe("network down");
  });
});
