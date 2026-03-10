import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("volunteer API", () => {
  it("should search volunteer posts by location", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 서울 강남역 좌표
    const result = await caller.volunteer.searchByLocation({
      latitude: 37.4979,
      longitude: 127.0276,
      sortBy: "distance",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // 첫 번째 결과가 올바른 구조를 가지는지 확인
    const post = result[0];
    expect(post).toHaveProperty("id");
    expect(post).toHaveProperty("title");
    expect(post).toHaveProperty("category");
    expect(post).toHaveProperty("distance");
  });

  it("should search volunteer posts by keyword", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.volunteer.searchByKeyword({
      keyword: "산책",
      latitude: 37.4979,
      longitude: 127.0276,
    });

    expect(Array.isArray(result)).toBe(true);
    // 산책 관련 게시글이 있으면 결과가 있어야 함
    if (result.length > 0) {
      expect(result[0].title.includes("산책") || result[0].category === "walk").toBe(true);
    }
  });

  it("should get volunteer post by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // 먼저 게시글 목록을 가져와서 ID를 얻음
    const posts = await caller.volunteer.searchByLocation({
      latitude: 37.4979,
      longitude: 127.0276,
      sortBy: "distance",
    });

    if (posts.length > 0) {
      const postId = posts[0].id;
      const post = await caller.volunteer.getById({ id: postId });

      expect(post).toBeDefined();
      expect(post?.id).toBe(postId);
      expect(post?.title).toBeDefined();
      expect(post?.description).toBeDefined();
      expect(post?.schedules).toBeDefined();
      expect(Array.isArray(post?.schedules)).toBe(true);
    }
  });

  it("should filter posts by category", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.volunteer.searchByLocation({
      latitude: 37.4979,
      longitude: 127.0276,
      category: "cleaning",
      sortBy: "distance",
    });

    expect(Array.isArray(result)).toBe(true);
    // 필터링된 결과는 모두 청소 카테고리여야 함
    result.forEach((post) => {
      expect(post.category).toBe("cleaning");
    });
  });

  it("should sort posts by recent", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.volunteer.searchByLocation({
      latitude: 37.4979,
      longitude: 127.0276,
      sortBy: "recent",
    });

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 1) {
      // 최신순 정렬이므로 첫 번째 게시글이 더 최근이어야 함
      const first = new Date(result[0].createdAt).getTime();
      const second = new Date(result[1].createdAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    }
  });
});
