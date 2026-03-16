import { Prisma, PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { nanoid } from "nanoid";
import type {
  AppUser,
  VolunteerPostView,
  VolunteerScheduleView,
  ApplicationView,
  BookmarkView,
  ReputationView,
  ReviewView,
  UserLocationView,
} from "@shared/types";

const GUID_LEN = 40;
function guid(): string {
  return nanoid(GUID_LEN);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function toAppUser(u: {
  id: bigint;
  guid: string;
  email: string;
  name: string;
  nickname: string;
  profileImgUrl: string | null;
  role: string;
  loginMethod: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AppUser {
  return {
    id: Number(u.id),
    openId: u.guid,
    name: u.name,
    email: u.email,
    nickname: u.nickname,
    loginMethod: u.loginMethod,
    role: u.role,
    profileImage: u.profileImgUrl,
    bio: null,
    activityTemperature: 0,
    latitude: null,
    longitude: null,
    address: null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastSignedIn: u.lastLoginAt ?? u.updatedAt,
  };
}

export async function getUserByOpenId(openId: string): Promise<AppUser | undefined> {
  try {
    if (openId.startsWith("email:")) {
      const email = openId.replace(/^email:/, "");
      const u = await prisma.user.findUnique({ where: { email, deletedAt: null } });
      return u ? toAppUser(u) : undefined;
    }
    const u = await prisma.user.findFirst({ where: { guid: openId, deletedAt: null } });
    return u ? toAppUser(u) : undefined;
  } catch {
    return undefined;
  }
}

export type UserAuthRow = {
  id: bigint;
  guid: string;
  email: string;
  name: string;
  password: string | null;
};

export async function getUserAuthByOpenId(openId: string): Promise<UserAuthRow | undefined> {
  try {
    if (openId.startsWith("email:")) {
      const email = openId.replace(/^email:/, "");
      const u = await prisma.user.findUnique({
        where: { email, deletedAt: null },
        select: { id: true, guid: true, email: true, name: true, password: true },
      });
      return u ?? undefined;
    }
    const u = await prisma.user.findFirst({
      where: { guid: openId, deletedAt: null },
      select: { id: true, guid: true, email: true, name: true, password: true },
    });
    return u ?? undefined;
  } catch {
    return undefined;
  }
}

export async function getUserById(id: number): Promise<AppUser | undefined> {
  try {
    const u = await prisma.user.findUnique({ where: { id: BigInt(id), deletedAt: null } });
    return u ? toAppUser(u) : undefined;
  } catch {
    return undefined;
  }
}

export type UpsertUserInput = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
};

export async function upsertUser(input: UpsertUserInput): Promise<void> {
  const guid = input.openId.startsWith("email:") ? input.openId : input.openId;
  const email = input.email ?? (input.openId.startsWith("email:") ? input.openId.replace(/^email:/, "") : null);
  if (!email) throw new Error("email or openId required for upsert");

  const nickname = (input.email ?? email).replace(/@.*/, "") + "_" + Date.now().toString(36);
  await prisma.user.upsert({
    where: { email },
    create: {
      guid,
      email,
      name: input.name ?? "사용자",
      nickname,
      loginMethod: input.loginMethod ?? "EMAIL",
      lastLoginAt: input.lastSignedIn ?? new Date(),
    },
    update: {
      name: input.name ?? undefined,
      loginMethod: input.loginMethod ?? undefined,
      lastLoginAt: input.lastSignedIn ?? undefined,
    },
  });
}

// --- 비밀번호 해시/검증 유틸 ---

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): Promise<boolean> {
  if (!storedHash) return false;
  const [algo, salt, keyHex] = storedHash.split(":");
  if (algo !== "scrypt" || !salt || !keyHex) return false;

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const key = Buffer.from(keyHex, "hex");
      if (key.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(key, derivedKey));
    });
  });
}

export async function setUserPasswordByEmail(email: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: { password: passwordHash },
  });
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function searchVolunteerPosts(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  category?: string,
  sortBy: "distance" | "recent" = "distance"
): Promise<(VolunteerPostView & { distance: number })[]> {
  try {
    const posts = await prisma.volunteerPost.findMany({
      where: { status: "RECRUITING", deletedAt: null },
      include: {
        authorUser: true,
        timeSlots: { where: { deletedAt: null }, orderBy: { date: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const withDistance = posts
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => {
        const distance = haversineDistance(latitude, longitude, p.lat!, p.lng!);
        return { post: p, distance };
      })
      .filter((x) => x.distance <= radiusKm);

    if (sortBy === "distance") withDistance.sort((a, b) => a.distance - b.distance);
    else withDistance.sort((a, b) => b.post.createdAt.getTime() - a.post.createdAt.getTime());

    return withDistance.map(({ post, distance }) => {
      const firstSlot = post.timeSlots[0];
      let durationText = "";
      if (firstSlot) {
        const [sh, sm] = firstSlot.startTime.split(":").map(Number);
        const [eh, em] = firstSlot.endTime.split(":").map(Number);
        const min = (eh * 60 + em) - (sh * 60 + sm);
        if (min >= 60) durationText = `${Math.floor(min / 60)}시간`;
        else durationText = `${min}분`;
      }
      return {
        id: Number(post.id),
        authorId: Number(post.authorUserId),
        authorName: post.authorUser?.name ?? post.shelterName ?? "",
        title: post.title,
        description: post.description,
        category: post.categoryId != null ? "other" : "other",
        shelterName: post.shelterName,
        address: post.formattedAddress ?? post.address1 ?? "",
        detailedLocation: post.address2 ?? null,
        thumbnailImage: post.thumbnailImageUrl ?? null,
        latitude: post.lat ?? 0,
        longitude: post.lng ?? 0,
        status: post.status,
        maxParticipants: post.timeSlots.reduce((s, t) => s + (t.maxParticipants ?? 0), 0),
        currentApplications: 0,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        distance,
        earliestDate: firstSlot?.date ?? null,
        durationText: durationText || null,
        hasRequiredItems: false,
      };
    });
  } catch {
    return [];
  }
}

export async function getVolunteerPostById(id: number): Promise<VolunteerPostView | undefined> {
  try {
    const post = await prisma.volunteerPost.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: {
        timeSlots: { where: { deletedAt: null } },
      },
    });
    if (!post) return undefined;

    const slotIds = post.timeSlots.map((s) => s.id);
    const counts = await prisma.applicationTimeSlot.groupBy({
      by: ["volunteerTimeSlotId"],
      where: { volunteerTimeSlotId: { in: slotIds } },
      _count: true,
    });
    const countMap = new Map(counts.map((c) => [c.volunteerTimeSlotId.toString(), c._count]));

    const schedules: VolunteerScheduleView[] = post.timeSlots.map((s) => ({
      id: Number(s.id),
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      maxSlots: s.maxParticipants ?? 0,
      currentApplications: countMap.get(s.id.toString()) ?? 0,
    }));

    const activityImages = post.activityImages as string[] | null;
    return {
      id: Number(post.id),
      authorId: Number(post.authorUserId),
      title: post.title,
      description: post.description,
      category: "other",
      shelterName: post.shelterName,
      address: post.formattedAddress ?? post.address1 ?? "",
      detailedLocation: post.address2 ?? null,
      thumbnailImage: post.thumbnailImageUrl ?? null,
      additionalImages: Array.isArray(activityImages) ? activityImages : [],
      latitude: post.lat ?? 0,
      longitude: post.lng ?? 0,
      status: post.status,
      maxParticipants: schedules.reduce((s: number, t: VolunteerScheduleView) => s + t.maxSlots, 0),
      currentApplications: schedules.reduce((s: number, t: VolunteerScheduleView) => s + t.currentApplications, 0),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      schedules,
      requiredItems: null,
      precautions: null,
    };
  } catch {
    return undefined;
  }
}

export async function getVolunteerSchedulesByPostId(postId: number): Promise<VolunteerScheduleView[]> {
  const post = await getVolunteerPostById(postId);
  return post?.schedules ?? [];
}

/** 일정 소유권 확인용: scheduleId로 일정 + 글 작성자 조회 */
export async function getSchedulePostAuthor(scheduleId: number): Promise<{ postId: number; authorId: number } | null> {
  const slot = await prisma.volunteerTimeSlot.findFirst({
    where: { id: BigInt(scheduleId), deletedAt: null },
    include: { volunteerPost: true },
  });
  if (!slot) return null;
  return { postId: Number(slot.volunteerPostId), authorId: Number(slot.volunteerPost.authorUserId) };
}

export type ApplicationWithDetailsView = ApplicationView & {
  postTitle: string;
  postAddress: string;
  scheduleDate: Date;
  startTime: string;
  endTime: string;
  authorName: string;
};

export async function getApplicationsByUserId(userId: number): Promise<ApplicationView[]> {
  try {
    const list = await prisma.volunteerApplication.findMany({
      where: { userId: BigInt(userId), deletedAt: null },
      include: { timeSlots: { include: { timeSlot: true } } },
      orderBy: { createdAt: "desc" },
    });
    return list.map((a) => ({
      id: Number(a.id),
      userId: Number(a.userId),
      postId: Number(a.volunteerPostId),
      scheduleId: a.timeSlots[0] ? Number(a.timeSlots[0].volunteerTimeSlotId) : 0,
      applicantName: a.applicantName ?? "",
      applicantPhone: a.applicantPhone ?? "",
      status: a.status,
      attended: a.attended,
      createdAt: a.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function getMyApplicationsWithDetails(
  userId: number
): Promise<ApplicationWithDetailsView[]> {
  try {
    const list = await prisma.volunteerApplication.findMany({
      where: { userId: BigInt(userId), deletedAt: null },
      include: {
        timeSlots: { include: { timeSlot: true } },
        volunteerPost: { include: { authorUser: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return list.map((a) => {
      const slot = a.timeSlots[0]?.timeSlot;
      return {
        id: Number(a.id),
        userId: Number(a.userId),
        postId: Number(a.volunteerPostId),
        scheduleId: slot ? Number(slot.id) : 0,
        applicantName: a.applicantName ?? "",
        applicantPhone: a.applicantPhone ?? "",
        status: a.status,
        attended: a.attended,
        createdAt: a.createdAt,
        postTitle: a.volunteerPost.title,
        postAddress: a.volunteerPost.formattedAddress ?? a.volunteerPost.address1 ?? "",
        scheduleDate: slot?.date ?? new Date(0),
        startTime: slot?.startTime ?? "",
        endTime: slot?.endTime ?? "",
        authorName: a.volunteerPost.authorUser?.name ?? "",
      };
    });
  } catch {
    return [];
  }
}

export async function getApplicationsByPostId(postId: number): Promise<ApplicationView[]> {
  try {
    const list = await prisma.volunteerApplication.findMany({
      where: { volunteerPostId: BigInt(postId), deletedAt: null },
      include: { timeSlots: { include: { timeSlot: true } } },
    });
    return list.map((a) => ({
      id: Number(a.id),
      userId: Number(a.userId),
      postId: Number(a.volunteerPostId),
      scheduleId: a.timeSlots[0] ? Number(a.timeSlots[0].volunteerTimeSlotId) : 0,
      applicantName: a.applicantName ?? "",
      applicantPhone: a.applicantPhone ?? "",
      status: a.status,
      attended: a.attended,
      attendanceStatus: a.attendanceStatus ?? null,
      createdAt: a.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function getApplicationById(id: number): Promise<ApplicationView | undefined> {
  try {
    const a = await prisma.volunteerApplication.findFirst({
      where: { id: BigInt(id), deletedAt: null },
      include: { timeSlots: true },
    });
    if (!a) return undefined;
    return {
      id: Number(a.id),
      userId: Number(a.userId),
      postId: Number(a.volunteerPostId),
      scheduleId: a.timeSlots[0] ? Number(a.timeSlots[0].volunteerTimeSlotId) : 0,
      applicantName: a.applicantName ?? "",
      applicantPhone: a.applicantPhone ?? "",
      status: a.status,
      attended: a.attended,
      attendanceStatus: a.attendanceStatus ?? null,
      createdAt: a.createdAt,
    };
  } catch {
    return undefined;
  }
}

export async function getBookmarksByUserId(userId: number): Promise<BookmarkView[]> {
  try {
    const groups = await prisma.bookmarkGroup.findMany({
      where: { userId: BigInt(userId), deletedAt: null },
      include: { bookmarks: { where: { deletedAt: null }, include: { volunteerPost: true } } },
    });
    const list: BookmarkView[] = [];
    for (const g of groups) {
      for (const b of g.bookmarks) {
        list.push({
          id: Number(b.id),
          userId,
          postId: Number(b.volunteerPostId),
          shelterName: null,
          type: "post",
          createdAt: b.createdAt,
        });
      }
    }
    return list;
  } catch {
    return [];
  }
}

export async function getPostsByAuthorId(authorId: number): Promise<VolunteerPostView[]> {
  try {
    const posts = await prisma.volunteerPost.findMany({
      where: { authorUserId: BigInt(authorId), deletedAt: null },
      include: { timeSlots: { where: { deletedAt: null } } },
      orderBy: { createdAt: "desc" },
    });
    return posts.map((p) => ({
      id: Number(p.id),
      authorId: Number(p.authorUserId),
      title: p.title,
      description: p.description,
      category: "other",
      shelterName: p.shelterName,
      address: p.formattedAddress ?? p.address1 ?? "",
      detailedLocation: p.address2 ?? null,
      thumbnailImage: p.thumbnailImageUrl ?? null,
      latitude: p.lat ?? 0,
      longitude: p.lng ?? 0,
      status: p.status,
      maxParticipants: p.timeSlots.reduce((s, t) => s + (t.maxParticipants ?? 0), 0),
      currentApplications: 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  } catch {
    return [];
  }
}

export async function searchVolunteerPostsByKeyword(
  keyword: string,
  latitude?: number,
  longitude?: number
): Promise<(VolunteerPostView & { distance?: number })[]> {
  try {
    const posts = await prisma.volunteerPost.findMany({
      where: {
        status: "RECRUITING",
        deletedAt: null,
        OR: [
          { title: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { shelterName: { contains: keyword, mode: "insensitive" } },
        ],
      },
      include: {
        authorUser: true,
        timeSlots: { where: { deletedAt: null }, orderBy: { date: "asc" } },
      },
    });

    const mapped = posts.map((p) => {
      const firstSlot = p.timeSlots[0];
      let durationText = "";
      if (firstSlot) {
        const [sh, sm] = firstSlot.startTime.split(":").map(Number);
        const [eh, em] = firstSlot.endTime.split(":").map(Number);
        const min = (eh * 60 + em) - (sh * 60 + sm);
        if (min >= 60) durationText = `${Math.floor(min / 60)}시간`;
        else durationText = `${min}분`;
      }
      return {
        id: Number(p.id),
        authorId: Number(p.authorUserId),
        authorName: p.authorUser?.name ?? p.shelterName ?? "",
        title: p.title,
        description: p.description,
        category: "other",
        shelterName: p.shelterName,
        address: p.formattedAddress ?? p.address1 ?? "",
        detailedLocation: p.address2 ?? null,
        thumbnailImage: p.thumbnailImageUrl ?? null,
        latitude: p.lat ?? 0,
        longitude: p.lng ?? 0,
        status: p.status,
        maxParticipants: p.timeSlots.reduce((s, t) => s + (t.maxParticipants ?? 0), 0),
        currentApplications: 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        distance: undefined as number | undefined,
        earliestDate: firstSlot?.date ?? null,
        durationText: durationText || null,
        hasRequiredItems: false,
      };
    });

    if (latitude != null && longitude != null) {
      mapped.forEach((p) => {
        p.distance = haversineDistance(latitude, longitude, p.latitude, p.longitude);
      });
      mapped.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return mapped;
  } catch {
    return [];
  }
}

export async function listAllVolunteerPosts(): Promise<VolunteerPostView[]> {
  try {
    const posts = await prisma.volunteerPost.findMany({
      where: { status: "RECRUITING", deletedAt: null },
      include: {
        timeSlots: { where: { deletedAt: null }, orderBy: { date: "asc" } },
        authorUser: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return posts.map((p) => {
      const firstSlot = p.timeSlots[0];
      return {
        id: Number(p.id),
        authorId: Number(p.authorUserId),
        title: p.title,
        description: p.description,
        category: "other",
        shelterName: p.shelterName,
        address: p.formattedAddress ?? p.address1 ?? "",
        detailedLocation: p.address2 ?? null,
        thumbnailImage: p.thumbnailImageUrl ?? null,
        latitude: p.lat ?? 0,
        longitude: p.lng ?? 0,
        status: p.status,
        maxParticipants: p.timeSlots.reduce((s, t) => s + (t.maxParticipants ?? 0), 0),
        currentApplications: 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      } satisfies VolunteerPostView & { distance?: number; earliestDate?: Date | null; durationText?: string | null; hasRequiredItems?: boolean | undefined };
    });
  } catch {
    return [];
  }
}

// --- Mutations ---

export type CreateVolunteerPostInput = {
  authorUserId: bigint;
  title: string;
  description: string;
  shelterName: string;
  address?: string | null;
  detailedLocation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  thumbnailImageUrl?: string | null;
  activityImages?: string[] | null;
};

export async function createVolunteerPost(input: CreateVolunteerPostInput): Promise<{ id: number }> {
  const now = new Date();
  const endDefault = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const row = await prisma.volunteerPost.create({
    data: {
      guid: guid(),
      authorUserId: input.authorUserId,
      authorType: "PERSONAL",
      title: input.title,
      description: input.description,
      shelterName: input.shelterName,
      formattedAddress: input.address ?? null,
      address2: input.detailedLocation ?? null,
      lat: input.latitude ?? null,
      lng: input.longitude ?? null,
      thumbnailImageUrl: input.thumbnailImageUrl ?? null,
      activityImages: input.activityImages ?? Prisma.DbNull,
      startDate: now,
      endDate: endDefault,
      status: "RECRUITING",
    },
  });
  return { id: Number(row.id) };
}

export type UpdateVolunteerPostInput = {
  id: number;
  title?: string;
  description?: string;
  shelterName?: string;
  status?: string;
  address?: string | null;
  detailedLocation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  thumbnailImageUrl?: string | null;
  activityImages?: string[] | null;
};

export async function updateVolunteerPost(input: UpdateVolunteerPostInput): Promise<void> {
  const data: Record<string, unknown> = {};
  if (input.title != null) data.title = input.title;
  if (input.description != null) data.description = input.description;
  if (input.shelterName != null) data.shelterName = input.shelterName;
  if (input.status != null) data.status = input.status;
  if (input.address !== undefined) data.formattedAddress = input.address;
  if (input.detailedLocation !== undefined) data.address2 = input.detailedLocation;
  if (input.latitude !== undefined) data.lat = input.latitude;
  if (input.longitude !== undefined) data.lng = input.longitude;
  if (input.thumbnailImageUrl !== undefined) data.thumbnailImageUrl = input.thumbnailImageUrl;
  if (input.activityImages !== undefined) data.activityImages = input.activityImages;
  await prisma.volunteerPost.update({
    where: { id: BigInt(input.id) },
    data: data as never,
  });
}

export type AddScheduleInput = {
  postId: number;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
};

export async function addSchedule(input: AddScheduleInput): Promise<{ id: number }> {
  const date = new Date(input.date + "T00:00:00Z");
  const row = await prisma.volunteerTimeSlot.create({
    data: {
      guid: guid(),
      volunteerPostId: BigInt(input.postId),
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      maxParticipants: input.maxParticipants,
      status: "OPEN",
    },
  });
  return { id: Number(row.id) };
}

export type UpdateScheduleInput = {
  scheduleId: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
};

export async function updateSchedule(input: UpdateScheduleInput): Promise<void> {
  const data: Record<string, unknown> = {};
  if (input.date != null) data.date = new Date(input.date + "T00:00:00Z");
  if (input.startTime != null) data.startTime = input.startTime;
  if (input.endTime != null) data.endTime = input.endTime;
  if (input.maxParticipants != null) data.maxParticipants = input.maxParticipants;
  await prisma.volunteerTimeSlot.update({
    where: { id: BigInt(input.scheduleId) },
    data: data as never,
  });
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
  await prisma.volunteerTimeSlot.update({
    where: { id: BigInt(scheduleId) },
    data: { deletedAt: new Date() },
  });
}

export type CreateApplicationInput = {
  userId: number;
  postId: number;
  scheduleId: number;
  applicantName?: string | null;
  applicantPhone?: string | null;
};

export async function createApplication(input: CreateApplicationInput): Promise<{ id: number }> {
  const postId = BigInt(input.postId);
  const scheduleId = BigInt(input.scheduleId);
  const userId = BigInt(input.userId);

  const [existing, slot, slotCount] = await Promise.all([
    prisma.volunteerApplication.findFirst({
      where: { userId, volunteerPostId: postId, deletedAt: null },
    }),
    prisma.volunteerTimeSlot.findFirst({
      where: { id: scheduleId, volunteerPostId: postId, deletedAt: null },
    }),
    prisma.applicationTimeSlot.count({
      where: { volunteerTimeSlotId: scheduleId },
    }),
  ]);

  if (existing) throw new Error("Already applied to this post.");
  if (!slot) throw new Error("Schedule not found.");
  const max = slot.maxParticipants ?? 0;
  if (max > 0 && slotCount >= max) throw new Error("No available slots.");

  const app = await prisma.volunteerApplication.create({
    data: {
      guid: guid(),
      userId,
      volunteerPostId: postId,
      status: "PENDING",
      applicantName: input.applicantName ?? null,
      applicantPhone: input.applicantPhone ?? null,
      isNotifiedAllowed: true,
      isAttentionAgreed: false,
    },
  });
  await prisma.applicationTimeSlot.create({
    data: {
      guid: guid(),
      volunteerApplicationId: app.id,
      volunteerTimeSlotId: scheduleId,
    },
  });
  return { id: Number(app.id) };
}

const DEFAULT_BOOKMARK_GROUP_NAME = "기본";
const DEFAULT_BOOKMARK_CATEGORY = "volunteer";

export async function getOrCreateDefaultBookmarkGroup(userId: number): Promise<number> {
  const bigId = BigInt(userId);
  let group = await prisma.bookmarkGroup.findFirst({
    where: { userId: bigId, category: DEFAULT_BOOKMARK_CATEGORY, deletedAt: null },
    orderBy: { seq: "asc" },
  });
  if (!group) {
    group = await prisma.bookmarkGroup.create({
      data: {
        guid: guid(),
        userId: bigId,
        seq: 1,
        name: DEFAULT_BOOKMARK_GROUP_NAME,
        category: DEFAULT_BOOKMARK_CATEGORY,
      },
    });
  }
  return Number(group.id);
}

export async function addBookmark(userId: number, postId: number): Promise<{ id: number }> {
  const groupId = await getOrCreateDefaultBookmarkGroup(userId);
  const existing = await prisma.bookmark.findFirst({
    where: {
      bookmarkGroupId: BigInt(groupId),
      volunteerPostId: BigInt(postId),
      deletedAt: null,
    },
  });
  if (existing) return { id: Number(existing.id) };
  const row = await prisma.bookmark.create({
    data: {
      guid: guid(),
      seq: 1,
      bookmarkGroupId: BigInt(groupId),
      volunteerPostId: BigInt(postId),
    },
  });
  return { id: Number(row.id) };
}

export async function removeBookmark(userId: number, bookmarkId: number): Promise<void> {
  const row = await prisma.bookmark.findFirst({
    where: { id: BigInt(bookmarkId), deletedAt: null },
    include: { bookmarkGroup: true },
  });
  if (!row || Number(row.bookmarkGroup.userId) !== userId) return;
  await prisma.bookmark.update({
    where: { id: BigInt(bookmarkId) },
    data: { deletedAt: new Date() },
  });
}

// --- 프로필 ---
export type UpdateUserProfileInput = {
  userId: number;
  name?: string | null;
  profileImage?: string | null;
  phone?: string | null;
};

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<void> {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.profileImage !== undefined) data.profileImgUrl = input.profileImage;
  if (input.phone !== undefined) data.phone = input.phone;
  await prisma.user.update({
    where: { id: BigInt(input.userId) },
    data: data as never,
  });
}

function toUserLocationView(row: {
  id: bigint;
  name: string;
  formattedAddress: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserLocationView {
  return {
    id: Number(row.id),
    name: row.name,
    formattedAddress: row.formattedAddress,
    address1: row.address1,
    address2: row.address2,
    address3: row.address3,
    postalCode: row.postalCode,
    latitude: row.lat,
    longitude: row.lng,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- 내 주소(UserLocation) ---
export async function listUserLocations(userId: number): Promise<UserLocationView[]> {
  const rows = await prisma.userLocation.findMany({
    where: { userId: BigInt(userId), deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(toUserLocationView);
}

export async function getDefaultUserLocation(userId: number): Promise<UserLocationView | null> {
  const row = await prisma.userLocation.findFirst({
    where: { userId: BigInt(userId), deletedAt: null, isDefault: true },
    orderBy: { updatedAt: "desc" },
  });
  return row ? toUserLocationView(row) : null;
}

export type UpsertUserLocationInput = {
  id?: number;
  userId: number;
  name: string;
  formattedAddress?: string | null;
  detailedLocation?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

export async function upsertUserLocation(input: UpsertUserLocationInput): Promise<UserLocationView> {
  const bigUserId = BigInt(input.userId);
  const shouldMakeDefault = input.isDefault === true;

  return await prisma.$transaction(async (tx) => {
    // 첫 주소는 기본으로
    const existingCount = await tx.userLocation.count({
      where: { userId: bigUserId, deletedAt: null },
    });
    const makeDefault = shouldMakeDefault || existingCount === 0;

    if (makeDefault) {
      await tx.userLocation.updateMany({
        where: { userId: bigUserId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
    }

    const data = {
      name: input.name,
      formattedAddress: input.formattedAddress ?? null,
      address2: input.detailedLocation ?? null,
      postalCode: input.postalCode ?? null,
      lat: input.latitude ?? null,
      lng: input.longitude ?? null,
      isDefault: makeDefault,
    };

    const row = input.id
      ? await tx.userLocation.update({
          where: { id: BigInt(input.id) },
          data: data as never,
        })
      : await tx.userLocation.create({
          data: {
            guid: guid(),
            userId: bigUserId,
            ...data,
          } as never,
        });

    return toUserLocationView(row);
  });
}

export async function deleteUserLocation(userId: number, locationId: number): Promise<void> {
  const bigUserId = BigInt(userId);
  const row = await prisma.userLocation.findFirst({
    where: { id: BigInt(locationId), userId: bigUserId, deletedAt: null },
  });
  if (!row) return;

  await prisma.$transaction(async (tx) => {
    await tx.userLocation.update({
      where: { id: BigInt(locationId) },
      data: { deletedAt: new Date(), isDefault: false } as never,
    });

    // 기본 주소가 삭제되면 가장 최근 주소를 기본으로 승격
    const remaining = await tx.userLocation.findFirst({
      where: { userId: bigUserId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    if (remaining) {
      await tx.userLocation.updateMany({
        where: { userId: bigUserId, deletedAt: null, isDefault: true },
        data: { isDefault: false },
      });
      await tx.userLocation.update({
        where: { id: remaining.id },
        data: { isDefault: true } as never,
      });
    }
  });
}

export async function setDefaultUserLocation(userId: number, locationId: number): Promise<void> {
  const bigUserId = BigInt(userId);
  const row = await prisma.userLocation.findFirst({
    where: { id: BigInt(locationId), userId: bigUserId, deletedAt: null },
  });
  if (!row) throw new Error("Location not found");

  await prisma.$transaction(async (tx) => {
    await tx.userLocation.updateMany({
      where: { userId: bigUserId, deletedAt: null, isDefault: true },
      data: { isDefault: false },
    });
    await tx.userLocation.update({
      where: { id: BigInt(locationId) },
      data: { isDefault: true } as never,
    });
  });
}

// --- 신청 승인/거절 ---
export async function updateApplicationStatus(
  applicationId: number,
  status: "APPROVED" | "REJECTED",
  postAuthorUserId: number
): Promise<void> {
  const app = await prisma.volunteerApplication.findFirst({
    where: { id: BigInt(applicationId), deletedAt: null },
    include: { volunteerPost: true },
  });
  if (!app || Number(app.volunteerPost.authorUserId) !== postAuthorUserId) {
    throw new Error("Application not found or unauthorized");
  }
  await prisma.volunteerApplication.update({
    where: { id: BigInt(applicationId) },
    data: { status },
  });
}

/** 신청자가 본인 신청 취소 */
export async function cancelApplicationByApplicant(
  applicationId: number,
  userId: number
): Promise<void> {
  const app = await prisma.volunteerApplication.findFirst({
    where: { id: BigInt(applicationId), deletedAt: null },
  });
  if (!app || Number(app.userId) !== userId) throw new Error("Application not found or unauthorized");
  await prisma.volunteerApplication.update({
    where: { id: BigInt(applicationId) },
    data: { status: "CANCELLED" },
  });
}

/** 작성자가 참가자 참석 여부 + 후기 저장 (평가) */
export async function setApplicationEvaluation(
  applicationId: number,
  postAuthorUserId: number,
  input: {
    attendanceStatus: "ATTENDED" | "ABSENT" | "NO_SHOW";
    rating: number;
    comment?: string | null;
    quickReviewTags?: string[];
  }
): Promise<void> {
  const app = await prisma.volunteerApplication.findFirst({
    where: { id: BigInt(applicationId), deletedAt: null },
    include: { volunteerPost: true },
  });
  if (!app || Number(app.volunteerPost.authorUserId) !== postAuthorUserId) {
    throw new Error("Application not found or unauthorized");
  }
  const attended = input.attendanceStatus === "ATTENDED";
  await prisma.volunteerApplication.update({
    where: { id: BigInt(applicationId) },
    data: { attended, attendanceStatus: input.attendanceStatus },
  });
  const commentText =
    (input.quickReviewTags?.length ? input.quickReviewTags.join(", ") + "\n\n" : "") +
    (input.comment ?? "");
  await createReview({
    writerId: postAuthorUserId,
    targetUserId: Number(app.userId),
    volunteerPostId: Number(app.volunteerPostId),
    rating: input.rating,
    comment: commentText.trim() || null,
    reviewType: "ORGANIZER_TO_PARTICIPANT",
  });
}

// --- 시간대별 신청 가능 여부 ---
export async function checkScheduleAvailability(scheduleId: number): Promise<{
  available: boolean;
  current: number;
  max: number;
  postId: number;
}> {
  const slot = await prisma.volunteerTimeSlot.findFirst({
    where: { id: BigInt(scheduleId), deletedAt: null },
  });
  if (!slot) throw new Error("Schedule not found");
  const current = await prisma.applicationTimeSlot.count({
    where: { volunteerTimeSlotId: BigInt(scheduleId) },
  });
  const max = slot.maxParticipants ?? 0;
  return {
    available: max === 0 || current < max,
    current,
    max,
    postId: Number(slot.volunteerPostId),
  };
}

// --- 평판 ---
export async function getReputationByUserId(userId: number): Promise<ReputationView | null> {
  const r = await prisma.reputationGroup.findFirst({
    where: { userId: BigInt(userId), deletedAt: null },
  });
  if (!r) return null;
  return {
    id: Number(r.id),
    userId: Number(r.userId),
    avgRating: r.avgRating,
    totalReviews: r.totalReviews,
    totalHearts: r.totalHearts,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function getReviewsByUserId(userId: number): Promise<ReviewView[]> {
  const group = await prisma.reputationGroup.findFirst({
    where: { userId: BigInt(userId), deletedAt: null },
  });
  if (!group) return [];
  const list = await prisma.review.findMany({
    where: { reputationGroupId: group.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return list.map((r) => ({
    id: Number(r.id),
    reputationGroupId: Number(r.reputationGroupId),
    writerId: Number(r.writerId),
    volunteerPostId: r.volunteerPostId != null ? Number(r.volunteerPostId) : null,
    rating: r.rating,
    comment: r.comment,
    reviewType: r.reviewType,
    createdAt: r.createdAt,
  }));
}

async function ensureReputationGroupForUser(userId: bigint): Promise<bigint> {
  let g = await prisma.reputationGroup.findFirst({
    where: { userId, deletedAt: null },
  });
  if (!g) {
    g = await prisma.reputationGroup.create({
      data: {
        guid: guid(),
        userId,
        avgRating: 0,
        totalReviews: 0,
        totalHearts: 0,
      },
    });
  }
  return g.id;
}

export type CreateReviewInput = {
  writerId: number;
  targetUserId: number;
  volunteerPostId: number | null;
  rating: number;
  comment: string | null;
  reviewType: "PARTICIPANT_TO_ORGANIZER" | "ORGANIZER_TO_PARTICIPANT";
};

export async function createReview(input: CreateReviewInput): Promise<{ id: number }> {
  const reputationGroupId = await ensureReputationGroupForUser(BigInt(input.targetUserId));
  const row = await prisma.review.create({
    data: {
      guid: guid(),
      reputationGroupId,
      writerId: BigInt(input.writerId),
      volunteerPostId: input.volunteerPostId != null ? BigInt(input.volunteerPostId) : null,
      rating: input.rating,
      comment: input.comment,
      reviewType: input.reviewType,
    },
  });
  const group = await prisma.reputationGroup.findUnique({
    where: { id: reputationGroupId },
  });
  if (group) {
    const reviews = await prisma.review.findMany({
      where: { reputationGroupId, deletedAt: null },
    });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const totalHearts = reviews.filter((r) => r.rating >= 4).length;
    await prisma.reputationGroup.update({
      where: { id: reputationGroupId },
      data: { avgRating: avg, totalReviews: reviews.length, totalHearts },
    });
  }
  return { id: Number(row.id) };
}

// --- 북마크 정렬 (거리순/최신순) ---
export async function getBookmarksByUserIdWithSort(
  userId: number,
  sortBy: "distance" | "recent",
  latitude?: number,
  longitude?: number
): Promise<BookmarkView[]> {
  const list = await getBookmarksByUserId(userId);
  if (list.length === 0) return [];
  const postIds = list.map((b) => b.postId).filter((id): id is number => id != null);
  if (postIds.length === 0) return list;
  const posts = await prisma.volunteerPost.findMany({
    where: { id: { in: postIds.map(BigInt) }, deletedAt: null },
  });
  const postMap = new Map(posts.map((p) => [Number(p.id), p]));
  const withPost: BookmarkView[] = list.map((b) => {
    const post = b.postId != null ? postMap.get(b.postId) : undefined;
    const lat = post?.lat ?? 0;
    const lng = post?.lng ?? 0;
    const distance =
      latitude != null && longitude != null && (lat !== 0 || lng !== 0)
        ? haversineDistance(latitude, longitude, lat, lng)
        : null;
    return {
      ...b,
      distance: distance ?? undefined,
      post:
        post != null
          ? {
              title: post.title,
              address: post.formattedAddress ?? post.address1 ?? "",
              latitude: post.lat ?? 0,
              longitude: post.lng ?? 0,
              createdAt: post.createdAt,
              thumbnailImage: post.thumbnailImageUrl ?? null,
              shelterName: post.shelterName ?? null,
              status: post.status,
            }
          : undefined,
    };
  });
  if (sortBy === "distance" && latitude != null && longitude != null) {
    withPost.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
  } else {
    withPost.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return withPost;
}
