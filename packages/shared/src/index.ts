export enum UserRole {
  ADMIN = "ADMIN",
  PARTNER = "PARTNER",
}

export enum UserStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
}

export enum AnnouncementTemplateStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum EventStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  ARCHIVED = "ARCHIVED",
}

export interface AuthUser {
  id: string;
  loginId: string;
  email: string | null;
  name: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  parentUserId: string | null;
}

export interface UserTreeNode extends AuthUser {
  children: UserTreeNode[];
}

export interface MonthlyCategoryStat {
  month: string;
  categoryId: string;
  categoryName: string;
  participationCount: number;
  totalQuantity: number;
}

export interface EventAnnouncementSummary {
  eventId: string;
  myRegisteredCount: number;
  myExpectedTotalAmount: number;
  descendantRegisteredCount: number;
  descendantExpectedTotalAmount: number;
  totalParticipantCount: number;
  totalExpectedAmount: number;
}
