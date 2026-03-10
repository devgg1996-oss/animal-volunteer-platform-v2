import { ONE_YEAR_MS } from "@shared/const";
import {
  getSessionCookieOptionsFromRequest,
  buildSetSessionCookieHeader,
} from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getUserById,
  getUserByOpenId,
  searchVolunteerPosts,
  getVolunteerPostById,
  getVolunteerSchedulesByPostId,
  getSchedulePostAuthor,
  getApplicationsByUserId,
  getMyApplicationsWithDetails,
  getApplicationsByPostId,
  getApplicationById,
  getBookmarksByUserId,
  getBookmarksByUserIdWithSort,
  getPostsByAuthorId,
  searchVolunteerPostsByKeyword,
  upsertUser,
  createVolunteerPost,
  updateVolunteerPost,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  createApplication,
  addBookmark,
  removeBookmark,
  updateUserProfile,
  updateApplicationStatus,
  cancelApplicationByApplicant,
  setApplicationEvaluation,
  checkScheduleAvailability,
  getReputationByUserId,
  getReviewsByUserId,
  createReview,
} from "./db";
import { uploadImage } from "./storage";

export const appRouter = router({
  system: systemRouter,

  /** 이미지 업로드 (인증 필요) */
  storage: router({
    upload: protectedProcedure
      .input(
        z.object({
          fileBase64: z.string().min(1),
          contentType: z.string().default("image/jpeg"),
          filename: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext =
          input.contentType === "image/png"
            ? "png"
            : input.contentType === "image/gif"
              ? "gif"
              : input.contentType === "image/webp"
                ? "webp"
                : "jpg";
        const name = input.filename?.replace(/\.[^.]+$/, "") || "image";
        const safeName = name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
        const relKey = `volunteer/${ctx.user.id}/${Date.now()}-${safeName}.${ext}`;
        const { url } = await uploadImage(relKey, buffer, input.contentType);
        return { url };
      }),
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.clearSessionCookie();
      return {
        success: true,
      } as const;
    }),
    /** 이메일 인증 코드 발송 (스텁: 실제 발송 없이 성공 반환) */
    sendEmailVerification: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async () => ({ success: true, message: "인증 코드가 발송되었습니다." })),

    /** 이메일 인증 코드 검증 (스텁: 항상 성공) */
    verifyEmail: publicProcedure
      .input(z.object({ email: z.string().email(), code: z.string().min(1) }))
      .mutation(async () => ({ success: true, verified: true })),

    /** 회원가입 (일반 이메일). 이메일 인증 후 사용 권장. */
    signup: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(4),
          name: z.string().min(1),
          verificationCode: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await upsertUser({
            openId: `email:${input.email}`,
            name: input.name,
            email: input.email,
            loginMethod: "email",
            lastSignedIn: new Date(),
          });
          return { success: true, message: "가입되었습니다." };
        } catch (e) {
          throw new Error("이미 사용 중인 이메일이거나 가입에 실패했습니다.");
        }
      }),

    /** 일반 로그인 (이메일/비밀번호). 테스트 계정: test@test.com / 1234. DB 없이도 테스트 계정 로그인 가능. */
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const TEST_EMAIL = "test@test.com";
        const TEST_PASSWORD = "1234";
        if (input.email !== TEST_EMAIL || input.password !== TEST_PASSWORD) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        const openId = `email:${input.email}`;
        const name = "테스트 사용자";
        let user = await getUserByOpenId(openId).catch(() => undefined);
        if (!user) {
          try {
            await upsertUser({
              openId,
              name,
              email: input.email,
              loginMethod: "email",
              lastSignedIn: new Date(),
            });
            user = await getUserByOpenId(openId);
          } catch {
            // DB 연결 실패 시에도 세션만 발급 (테스트용)
            user = undefined;
          }
        }
        const token = await sdk.createSessionToken(openId, {
          name: user?.name ?? name,
          expiresInMs: ONE_YEAR_MS,
        });
        const options = getSessionCookieOptionsFromRequest(ctx.req);
        const headerValue = buildSetSessionCookieHeader(
          token,
          options,
          Math.floor(ONE_YEAR_MS / 1000)
        );
        ctx.resHeaders.append("Set-Cookie", headerValue);
        return {
          success: true,
          user: {
            id: user?.id ?? 0,
            name: user?.name ?? name,
            email: user?.email ?? input.email,
          },
        };
      }),
  }),

  // 사용자 프로필
  user: router({
    /** 내 프로필 조회 (auth.me와 동일, 마이페이지용) */
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new Error("User not found");
      return user;
    }),
    /** 내 프로필 수정 */
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).optional(),
          profileImage: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile({
          userId: ctx.user.id,
          name: input.name,
          profileImage: input.profileImage,
          phone: input.phone,
        });
        return { success: true };
      }),
  }),

  // 봉사 모집글 관련 API
  volunteer: router({
    // 위치 기반 봉사 모집글 검색
    searchByLocation: publicProcedure
      .input(
        z.object({
          latitude: z.number(),
          longitude: z.number(),
          radiusKm: z.number().default(10),
          category: z.enum(["walk", "cleaning", "transport", "other"]).optional(),
          sortBy: z.enum(["distance", "recent"]).default("distance"),
        })
      )
      .query(async ({ input }) => {
        return await searchVolunteerPosts(
          input.latitude,
          input.longitude,
          input.radiusKm,
          input.category,
          input.sortBy
        );
      }),

    // 키워드로 봉사 모집글 검색
    searchByKeyword: publicProcedure
      .input(
        z.object({
          keyword: z.string(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await searchVolunteerPostsByKeyword(input.keyword, input.latitude, input.longitude);
      }),

    // 봉사 모집글 상세 조회
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await getVolunteerPostById(input.id);
        if (!post) return null;

        const schedules = await getVolunteerSchedulesByPostId(input.id);
        return { ...post, schedules };
      }),

    // 봉사 모집글 생성
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().max(80),
          description: z.string().max(2200),
          category: z.enum(["walk", "cleaning", "transport", "other"]),
          shelterName: z.string().optional(),
          latitude: z.number(),
          longitude: z.number(),
          address: z.string(),
          detailedLocation: z.string().optional(),
          thumbnailImage: z.string().optional(),
          additionalImages: z.array(z.string()).optional(),
          requiredItems: z.array(z.string()).optional(),
          precautions: z.string().optional(),
          maxParticipants: z.number().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createVolunteerPost({
          authorUserId: BigInt(ctx.user.id),
          title: input.title,
          description: input.description,
          shelterName: input.shelterName ?? "",
          address: input.address,
          detailedLocation: input.detailedLocation ?? null,
          latitude: input.latitude,
          longitude: input.longitude,
          thumbnailImageUrl: input.thumbnailImage ?? null,
          activityImages: input.additionalImages ?? null,
        });
        return { id: result.id };
      }),

    // 봉사 모집글 수정
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().max(80).optional(),
          description: z.string().max(2200).optional(),
          thumbnailImage: z.string().optional(),
          additionalImages: z.array(z.string()).optional(),
          requiredItems: z.array(z.string()).optional(),
          precautions: z.string().optional(),
          status: z.enum(["recruiting", "closed", "completed"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const post = await getVolunteerPostById(input.id);
        if (!post) throw new Error("Post not found");
        if (post.authorId !== ctx.user.id) throw new Error("Unauthorized");

        await updateVolunteerPost({
          id: input.id,
          title: input.title,
          description: input.description,
          thumbnailImageUrl: input.thumbnailImage,
          activityImages: input.additionalImages,
          status: input.status === "recruiting" ? "RECRUITING" : input.status === "closed" ? "CLOSED" : input.status === "completed" ? "COMPLETED" : undefined,
        });
        return { success: true };
      }),

    // 봉사 일정 추가
    addSchedule: protectedProcedure
      .input(
        z.object({
          postId: z.number(),
          date: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          maxSlots: z.number().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const post = await getVolunteerPostById(input.postId);
        if (!post) throw new Error("Post not found");
        if (post.authorId !== ctx.user.id) throw new Error("Unauthorized");

        const result = await addSchedule({
          postId: input.postId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          maxParticipants: input.maxSlots,
        });
        return { id: result.id };
      }),

    // 봉사 일정 수정
    updateSchedule: protectedProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          maxSlots: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const meta = await getSchedulePostAuthor(input.scheduleId);
        if (!meta) throw new Error("Schedule not found");
        if (meta.authorId !== ctx.user.id) throw new Error("Unauthorized");

        await updateSchedule({
          scheduleId: input.scheduleId,
          startTime: input.startTime,
          endTime: input.endTime,
          maxParticipants: input.maxSlots,
        });
        return { success: true };
      }),

    // 봉사 일정 삭제
    deleteSchedule: protectedProcedure
      .input(z.object({ scheduleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const meta = await getSchedulePostAuthor(input.scheduleId);
        if (!meta) throw new Error("Schedule not found");
        if (meta.authorId !== ctx.user.id) throw new Error("Unauthorized");

        await deleteSchedule(input.scheduleId);
        return { success: true };
      }),

    // 내가 작성한 봉사 모집글 목록
    getMyPosts: protectedProcedure.query(async ({ ctx }) => {
      return await getPostsByAuthorId(ctx.user.id);
    }),
  }),

  // 봉사 신청 관련 API
  application: router({
    // 봉사 신청
    create: protectedProcedure
      .input(
        z.object({
          postId: z.number(),
          scheduleId: z.number(),
          applicantName: z.string(),
          applicantPhone: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await createApplication({
            userId: ctx.user.id,
            postId: input.postId,
            scheduleId: input.scheduleId,
            applicantName: input.applicantName,
            applicantPhone: input.applicantPhone,
          });
          return { id: result.id };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Application failed";
          throw new Error(msg);
        }
      }),

    /** 내 신청 목록 */
    getMyApplications: protectedProcedure.query(async ({ ctx }) => {
      return await getApplicationsByUserId(ctx.user.id);
    }),

    /** 내 신청 목록 (글 제목·일정·주소 포함, 마이페이지용) */
    getMyApplicationsWithDetails: protectedProcedure.query(async ({ ctx }) => {
      return await getMyApplicationsWithDetails(ctx.user.id);
    }),

    /** 신청 단건 상세 (신청자 본인 또는 해당 글 작성자만 조회 가능) */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const app = await getApplicationById(input.id);
        if (!app) return null;
        if (app.userId !== ctx.user.id) {
          const post = await getVolunteerPostById(app.postId);
          if (!post || post.authorId !== ctx.user.id) throw new Error("Unauthorized");
        }
        return app;
      }),

    /** 모집글별 신청자 목록 (해당 글 작성자만 조회 가능) */
    getByPostId: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        const post = await getVolunteerPostById(input.postId);
        if (!post || post.authorId !== ctx.user.id) throw new Error("Unauthorized");
        return await getApplicationsByPostId(input.postId);
      }),

    /** 해당 시간대 신청 가능 여부 확인 */
    checkSlotAvailability: publicProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return await checkScheduleAvailability(input.scheduleId);
      }),

    /** 신청 승인 (글 작성자만) */
    approve: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await updateApplicationStatus(input.applicationId, "APPROVED", ctx.user.id);
        return { success: true };
      }),

    /** 신청 거절 (글 작성자만) */
    reject: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await updateApplicationStatus(input.applicationId, "REJECTED", ctx.user.id);
        return { success: true };
      }),

    /** 신청 취소 (신청자 본인만) */
    cancel: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await cancelApplicationByApplicant(input.applicationId, ctx.user.id);
        return { success: true };
      }),

    /** 참가자 평가 (글 작성자만): 참석 여부 + 후기 저장 */
    submitEvaluation: protectedProcedure
      .input(
        z.object({
          applicationId: z.number(),
          attendanceStatus: z.enum(["ATTENDED", "ABSENT", "NO_SHOW"]),
          rating: z.number().min(1).max(5),
          comment: z.string().max(500).nullable().optional(),
          quickReviewTags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await setApplicationEvaluation(input.applicationId, ctx.user.id, {
          attendanceStatus: input.attendanceStatus,
          rating: input.rating,
          comment: input.comment ?? null,
          quickReviewTags: input.quickReviewTags,
        });
        return { success: true };
      }),
  }),

  // 북마크 관련 API
  bookmark: router({
    // 북마크 추가 (봉사글만 지원)
    add: protectedProcedure
      .input(
        z.object({
          postId: z.number().optional(),
          shelterName: z.string().optional(),
          type: z.enum(["post", "shelter"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.type !== "post" || input.postId == null) {
          throw new Error("Only post bookmarks are supported");
        }
        const result = await addBookmark(ctx.user.id, input.postId);
        return { id: result.id };
      }),

    /** 내 북마크 목록 (정렬: 거리순/최신순, 거리순 시 latitude/longitude 필요) */
    getMyBookmarks: protectedProcedure
      .input(
        z.object({
          sortBy: z.enum(["distance", "recent"]).default("recent"),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        if (input.sortBy === "distance" && input.latitude != null && input.longitude != null) {
          return await getBookmarksByUserIdWithSort(
            ctx.user.id,
            "distance",
            input.latitude,
            input.longitude
          );
        }
        return await getBookmarksByUserIdWithSort(ctx.user.id, "recent");
      }),

    /** 북마크 삭제 */
    remove: protectedProcedure
      .input(z.object({ bookmarkId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeBookmark(ctx.user.id, input.bookmarkId);
        return { success: true };
      }),
  }),

  // 평판
  reputation: router({
    /** 내 평판 조회 (하트, 후기 수, 평균 평점) */
    getMyReputation: protectedProcedure.query(async ({ ctx }) => {
      return await getReputationByUserId(ctx.user.id);
    }),
    /** 특정 사용자 평판 조회 (공개) */
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await getReputationByUserId(input.userId);
      }),
    /** 특정 사용자 후기 목록 */
    getReviewsByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await getReviewsByUserId(input.userId);
      }),
  }),

  // 후기 (평판 작성)
  review: router({
    /** 신청자/참여자에 대한 평판(후기) 작성. 주최자가 참여자에게 작성 시 reviewType: ORGANIZER_TO_PARTICIPANT */
    create: protectedProcedure
      .input(
        z.object({
          targetUserId: z.number(),
          volunteerPostId: z.number().nullable(),
          rating: z.number().min(1).max(5),
          comment: z.string().max(500).nullable().optional(),
          reviewType: z.enum(["PARTICIPANT_TO_ORGANIZER", "ORGANIZER_TO_PARTICIPANT"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createReview({
          writerId: ctx.user.id,
          targetUserId: input.targetUserId,
          volunteerPostId: input.volunteerPostId ?? null,
          rating: input.rating,
          comment: input.comment ?? null,
          reviewType: input.reviewType,
        });
        return { id: result.id };
      }),
  }),

  // 문자/이메일 인증 스텁 (실제 연동 시 구현 교체)
  verification: router({
    /** 문자 인증 코드 발송 (스텁) */
    sendSmsCode: publicProcedure
      .input(z.object({ phone: z.string().min(1) }))
      .mutation(async () => ({ success: true, message: "인증 코드가 발송되었습니다." })),

    /** 문자 인증 코드 검증 (스텁: 항상 성공) */
    verifySmsCode: publicProcedure
      .input(z.object({ phone: z.string().min(1), code: z.string().min(1) }))
      .mutation(async () => ({ success: true, verified: true })),
  }),
});

export type AppRouter = typeof appRouter;
