/**
 * 앱에서 사용하는 공통 타입 (Prisma 모델과 매핑)
 */

export type AppUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  nickname: string | null;
  loginMethod: string | null;
  role: string;
  profileImage: string | null;
  bio: string | null;
  activityTemperature: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type UserLocationView = {
  id: number;
  name: string;
  formattedAddress: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VolunteerScheduleView = {
  id: number;
  date: Date;
  startTime: string;
  endTime: string;
  maxSlots: number;
  currentApplications: number;
};

export type VolunteerPostView = {
  id: number;
  authorId: number;
  title: string;
  description: string;
  category: string;
  shelterName: string | null;
  address: string;
  detailedLocation: string | null;
  thumbnailImage: string | null;
  /** 활동 관련 이미지 URL 목록 (최대 8장) */
  additionalImages?: string[];
  latitude: number;
  longitude: number;
  status: string;
  maxParticipants: number;
  currentApplications: number;
  createdAt: Date;
  updatedAt: Date;
  schedules?: VolunteerScheduleView[];
  distance?: number;
  /** 준비물 목록 (JSON 문자열 또는 null) */
  requiredItems?: string | null;
  /** 주의사항 */
  precautions?: string | null;
};

export type ApplicationView = {
  id: number;
  userId: number;
  postId: number;
  scheduleId: number;
  applicantName: string;
  applicantPhone: string;
  status: string;
  attended: boolean | null;
  /** ATTENDED | ABSENT | NO_SHOW */
  attendanceStatus?: string | null;
  createdAt: Date;
  /** 신청 거절 사유 (있을 경우) */
  rejectionReason?: string | null;
};

export type BookmarkView = {
  id: number;
  userId: number;
  postId: number | null;
  shelterName: string | null;
  type: string;
  createdAt: Date;
  /** 정렬용: 거리(km) 또는 null */
  distance?: number | null;
  /** 북마크한 글 요약 (정렬 시 포함) */
  post?: Pick<
    VolunteerPostView,
    "title" | "address" | "latitude" | "longitude" | "createdAt" | "thumbnailImage" | "shelterName" | "status"
  > | null;
};

export type ReputationView = {
  id: number;
  userId: number;
  avgRating: number;
  totalReviews: number;
  totalHearts: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewView = {
  id: number;
  reputationGroupId: number;
  writerId: number;
  volunteerPostId: number | null;
  rating: number;
  comment: string | null;
  reviewType: "PARTICIPANT_TO_ORGANIZER" | "ORGANIZER_TO_PARTICIPANT";
  createdAt: Date;
}
