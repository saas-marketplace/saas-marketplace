import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/**
 * Audit Log Entry Interface
 */
export interface AuditLogEntry {
  action: string;
  user_id: string;
  user_email?: string;
  section: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Creates an audit log entry in the database
 * @param params - Object containing action, section, details, and user info
 * @returns Promise<void>
 */
export async function logAudit({
  action,
  section,
  details,
  user_id,
  user_email,
}: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      action,
      section,
      details,
      user_id,
      user_email: user_email || "unknown",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`[Audit] Failed to log "${action}":`, error);
    }
  } catch (err) {
    console.error(`[Audit] Error logging "${action}":`, err);
  }
}

/**
 * Predefined audit actions
 */
export const AuditActions = {
  // Team Members
  CREATE_TEAM_MEMBER: "CREATE_TEAM_MEMBER",
  UPDATE_TEAM_MEMBER: "UPDATE_TEAM_MEMBER",
  DELETE_TEAM_MEMBER: "DELETE_TEAM_MEMBER",
  // Products
  CREATE_PRODUCT: "CREATE_PRODUCT",
  UPDATE_PRODUCT: "UPDATE_PRODUCT",
  DELETE_PRODUCT: "DELETE_PRODUCT",
  // Requests
  CREATE_REQUEST: "CREATE_REQUEST",
  UPDATE_REQUEST: "UPDATE_REQUEST",
  // Authentication
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
} as const;

/**
 * Predefined audit sections
 */
export const AuditSections = {
  TEAM_MEMBERS: "Team Members",
  PRODUCTS: "Products",
  REQUESTS: "Requests",
  AUTH: "Authentication",
} as const;

/**
 * Helper to log team member actions
 */
export async function logTeamMemberAction({
  action,
  user,
  memberName,
}: {
  action: "CREATE_TEAM_MEMBER" | "UPDATE_TEAM_MEMBER" | "DELETE_TEAM_MEMBER";
  user: { id: string; email: string };
  memberName: string;
}) {
  const details =
    action === "CREATE_TEAM_MEMBER"
      ? `Created team member: ${memberName}`
      : action === "UPDATE_TEAM_MEMBER"
      ? `Updated team member: ${memberName}`
      : `Deleted team member: ${memberName}`;

  await logAudit({
    action,
    section: AuditSections.TEAM_MEMBERS,
    details,
    user_id: user.id,
    user_email: user.email,
  });
}

/**
 * Helper to log product actions
 */
export async function logProductAction({
  action,
  user,
  productName,
}: {
  action: "CREATE_PRODUCT" | "UPDATE_PRODUCT" | "DELETE_PRODUCT";
  user: { id: string; email: string };
  productName: string;
}) {
  const details =
    action === "CREATE_PRODUCT"
      ? `Created product: ${productName}`
      : action === "UPDATE_PRODUCT"
      ? `Updated product: ${productName}`
      : `Deleted product: ${productName}`;

  await logAudit({
    action,
    section: AuditSections.PRODUCTS,
    details,
    user_id: user.id,
    user_email: user.email,
  });
}

/**
 * Helper to log request actions
 */
export async function logRequestAction({
  action,
  user,
  requestTitle,
}: {
  action: "CREATE_REQUEST" | "UPDATE_REQUEST";
  user: { id: string; email: string };
  requestTitle: string;
}) {
  const details =
    action === "CREATE_REQUEST"
      ? `Submitted request: ${requestTitle}`
      : `Updated request: ${requestTitle}`;

  await logAudit({
    action,
    section: AuditSections.REQUESTS,
    details,
    user_id: user.id,
    user_email: user.email,
  });
}

/**
 * Helper to log authentication actions
 */
export async function logAuthAction({
  action,
  user,
}: {
  action: "USER_LOGIN" | "USER_LOGOUT";
  user: { id: string; email: string };
}) {
  const details =
    action === "USER_LOGIN" ? "User logged in" : "User logged out";

  await logAudit({
    action,
    section: AuditSections.AUTH,
    details,
    user_id: user.id,
    user_email: user.email,
  });
}