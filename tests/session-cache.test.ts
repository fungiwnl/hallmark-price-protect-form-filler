import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCachedProfile,
  readCachedProfile,
  SESSION_PROFILE_CACHE_KEY,
  writeCachedProfile
} from "../src/popup/sessionCache";

class MemoryStorageArea {
  private data: Record<string, unknown> = {};

  async get(key: string): Promise<Record<string, unknown>> {
    return { [key]: this.data[key] };
  }

  async set(items: Record<string, unknown>): Promise<void> {
    this.data = { ...this.data, ...items };
  }

  async remove(key: string): Promise<void> {
    delete this.data[key];
  }

  readRaw(key: string): unknown {
    return this.data[key];
  }
}

describe("session cache", () => {
  beforeEach(async () => {
    await clearCachedProfile({});
  });

  it("writes and reads a cached profile within TTL", async () => {
    const session = new MemoryStorageArea();
    const profile = { firstName: "Ada", email: "ada@example.com" };

    await writeCachedProfile(profile, { session }, 1_000, 60_000);
    const cached = await readCachedProfile({ session }, 1_500);

    expect(cached).toEqual(profile);
  });

  it("returns undefined and clears expired cache", async () => {
    const session = new MemoryStorageArea();
    const profile = { firstName: "Ada" };

    await writeCachedProfile(profile, { session }, 1_000, 2_000);
    const cached = await readCachedProfile({ session }, 3_500);

    expect(cached).toBeUndefined();
    expect(session.readRaw(SESSION_PROFILE_CACHE_KEY)).toBeUndefined();
  });

  it("clears cache explicitly", async () => {
    const session = new MemoryStorageArea();

    await writeCachedProfile({ firstName: "Ada" }, { session }, 1_000, 60_000);
    await clearCachedProfile({ session });

    expect(session.readRaw(SESSION_PROFILE_CACHE_KEY)).toBeUndefined();
  });

  it("falls back to in-memory cache when session cache is unavailable", async () => {
    const profile = { firstName: "Ada" };

    await writeCachedProfile(profile, {}, 1_000, 60_000);
    const cached = await readCachedProfile({}, 1_500);
    expect(cached).toEqual(profile);
  });

  it("expires in-memory cache when TTL passes", async () => {
    await writeCachedProfile({ firstName: "Ada" }, {}, 1_000, 1_000);
    const cached = await readCachedProfile({}, 2_001);
    expect(cached).toBeUndefined();
  });
});
