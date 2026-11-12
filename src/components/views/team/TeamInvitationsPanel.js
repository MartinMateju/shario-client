"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  useGetWorkspaceInvitationsQuery,
  useResendWorkspaceInvitationMutation,
  useRevokeWorkspaceInvitationMutation,
} from "@/lib/features/workspace-access/teamInvitationsApiSlice";

export const invitationDeliveryKey = (invitation) =>
  ["sent", "failed"].includes(invitation?.deliveryStatus)
    ? invitation.deliveryStatus
    : "pending";

export const invitationRateErrorKey = (error) => {
  const code = error?.data?.code || error?.data?.error?.code;
  if (code === "TEAM_INVITATION_RESEND_TOO_SOON")
    return "invitations.errors.resendTooSoon";
  if (code === "TEAM_INVITATION_RATE_LIMITED")
    return "invitations.errors.rateLimited";
  return null;
};

export const canManageInvitation = (invitation, access, canManageOwners) => {
  if (invitation?.roleKey === "owner" && !canManageOwners) return false;
  if (access?.locationAccess?.mode !== "selected") return true;
  const allowed = new Set(
    (access.locationAccess.locationIds || []).map(String),
  );
  return (
    invitation?.locationAccess?.mode === "selected" &&
    (invitation.locationAccess.locationIds || []).every((id) =>
      allowed.has(String(id)),
    )
  );
};

export default function TeamInvitationsPanel({
  access,
  canManageOwners,
  onDelivery,
}) {
  const t = useTranslations("TeamSettings");
  const locale = useLocale();
  const query = useGetWorkspaceInvitationsQuery();
  const [resend, { isLoading: isResending }] =
    useResendWorkspaceInvitationMutation();
  const [revoke, { isLoading: isRevoking }] =
    useRevokeWorkspaceInvitationMutation();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = isResending || isRevoking;
  const invitations = (query.data?.invitations || []).filter((item) =>
    ["pending", "expired"].includes(item.status),
  );

  const act = async (invitation, action) => {
    if (busy) return;
    if (
      action === "revoke" &&
      !window.confirm(
        t("invitations.revokeConfirm", { email: invitation.email }),
      )
    )
      return;
    setError("");
    setNotice("");
    try {
      if (action === "resend") {
        const result = await resend({
          id: invitation.id,
          locale: locale === "cs" ? "cs" : "en",
        }).unwrap();
        onDelivery(result.invitation);
      } else {
        await revoke(invitation.id).unwrap();
        setNotice(t("invitations.revoked"));
      }
    } catch (requestError) {
      setError(
        t(
          invitationRateErrorKey(requestError) ||
            `invitations.errors.${action}`,
        ),
      );
    }
  };

  return (
    <section
      className="overflow-hidden rounded-[20px] border border-line bg-white"
      aria-labelledby="team-invitations-title"
      data-team-invitations
    >
      <div className="border-b border-line bg-surface-muted px-5 py-4">
        <h2 id="team-invitations-title" className="text-sm font-semibold">
          {t("invitations.title")}
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          {t("invitations.description")}
        </p>
      </div>
      {query.isLoading && (
        <p role="status" className="p-5 text-sm">
          {t("loading")}
        </p>
      )}
      {(query.isError || error) && (
        <p role="alert" className="p-5 text-sm text-terracotta-700">
          {error || t("errors.load")}
        </p>
      )}
      {notice && (
        <p role="status" className="p-5 text-sm">
          {notice}
        </p>
      )}
      {!query.isLoading && !query.isError && invitations.length === 0 && (
        <p className="p-5 text-sm text-ink-muted">{t("invitations.empty")}</p>
      )}
      <div className="divide-y divide-line">
        {invitations.map((invitation) => {
          const expiresAt = new Date(invitation.expiresAt);
          const expiry = Number.isNaN(expiresAt.getTime())
            ? "—"
            : new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(expiresAt);
          return (
            <article
              key={invitation.id}
              className="flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-center"
              data-team-invitation-row
            >
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-semibold">
                  {invitation.email}
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  {invitation.roleName || t(`roles.${invitation.roleKey}`)} ·{" "}
                  {invitation.locationAccess?.mode === "selected"
                    ? t("selectedLocations", {
                        count:
                          invitation.locationAccess.locationIds?.length || 0,
                      })
                    : t("allLocations")}
                </p>
                <p className="mt-1 text-xs">
                  {t(`invitations.statuses.${invitation.status}`)} ·{" "}
                  {t(
                    `invitations.delivery.${invitationDeliveryKey(invitation)}`,
                  )}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {t("invitations.expires", { date: expiry })}
                  {invitation.mode === "sign_in"
                    ? ` · ${t("invitations.signInLink")}`
                    : ""}
                </p>
              </div>
              {canManageInvitation(invitation, access, canManageOwners) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(invitation, "resend")}
                    className="min-h-11 rounded-full border border-line px-4 text-xs font-semibold disabled:opacity-50"
                  >
                    {t("invitations.resend")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(invitation, "revoke")}
                    className="min-h-11 rounded-full border border-line px-4 text-xs font-semibold text-terracotta-700 disabled:opacity-50"
                  >
                    {t("invitations.revoke")}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
