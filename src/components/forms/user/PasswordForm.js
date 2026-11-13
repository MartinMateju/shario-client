"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useLegacyText } from "@/i18n/useLegacyCopy";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import ConfirmationModal from "../../modals/ConformationModal";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { PWD_REGEX } from "@/config/constants";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { useUpdateUserPassMutation } from "@/lib/features/users/usersApiSlice";
import { formatMakerId, resolveUserMemberId } from "@/utils/memberIdentity";

const cx = (...classes) => classes.filter(Boolean).join(" ");

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#483827]">
        {label}
      </label>

      <div
        className={cx(
          "mt-2 flex h-12 items-center rounded-2xl border bg-white/75 transition",
          "focus-within:border-[#9f8d7c] focus-within:bg-white focus-within:shadow-[0_10px_28px_rgba(72,56,39,0.06)]",
          error ? "border-red-300" : "border-[#e4d9cf]",
        )}
      >
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 rounded-2xl border-0 bg-transparent px-4 text-sm text-[#241b14] placeholder:text-[#b3a79c] focus:ring-0"
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="mr-2 flex h-9 w-9 items-center justify-center rounded-full text-[#8f7b69] transition hover:bg-[#f7f3ee] hover:text-[#483827]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeSlashIcon className="h-4.5 w-4.5" />
          ) : (
            <EyeIcon className="h-4.5 w-4.5" />
          )}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function PasswordForm({ className = "" }) {
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const [updateUserPass, { isLoading, isSuccess, isError, error }] =
    useUpdateUserPassMutation();

  const currentUser = useSelector(selectCurrentUser) || {};
  const language = useSelector(selectCurrentLanguage) || "CZ";

  const userId = currentUser.id || currentUser._id;
  const memberId = formatMakerId(resolveUserMemberId(currentUser));

  const [isEditing, setIsEditing] = useState(false);
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const passwordMatch = useMemo(() => {
    return newPassword.length > 0 && newPassword === newPasswordConfirm;
  }, [newPassword, newPasswordConfirm]);

  const validPassword = useMemo(() => {
    return PWD_REGEX.test(newPassword);
  }, [newPassword]);

  const canSave =
    Boolean(userId) &&
    Boolean(currentPassword) &&
    Boolean(newPassword) &&
    Boolean(newPasswordConfirm) &&
    validPassword &&
    passwordMatch &&
    !isLoading;

  const resetForm = () => {
    setSubmitted(false);
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
  };

  useEffect(() => {
    if (!isSuccess) return;

    setShowModalConfirm(true);
    setIsEditing(false);
    resetForm();
  }, [isSuccess]);

  const apiErrorMsg = getLocalizedApiErrorMessage(
    error,
    isError
      ? legacyText(
          "PasswordForm_Could_not_update_the_password_Please_try_again_950ff",
        )
      : "",
  );

  const handleCancel = () => {
    setIsEditing(false);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (!canSave) return;

    await updateUserPass({
      id: userId,
      currentPass: currentPassword,
      newPass: newPassword,
      newPassConfirm: newPasswordConfirm,
    });
  };

  return (
    <>
      <ConfirmationModal
        open={showModalConfirm}
        setOpen={setShowModalConfirm}
        title={translation["PASS_UPDATE_TITLE"]?.[language]}
        text={translation["PASS_UPDATE_CONTENT"]?.[language]}
      />

      <section
        className={cx(
          "overflow-hidden rounded-[34px] border border-[#e4d9cf] bg-white/70 shadow-[0_24px_70px_rgba(72,56,39,0.08)] backdrop-blur-xl",
          className,
        )}
      >
        <div className="border-b border-[#eadfd5] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d8cec3] bg-[#f7f3ee] text-[#7f6d5d]">
                <ShieldCheckIcon className="h-5 w-5 stroke-[1.7]" />
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#a39182]">
                  {legacyText("PasswordForm_Security_f25ce")}
                </p>

                <h2 className="mt-2 text-2xl font-medium tracking-[-0.035em] text-[#241b14] sm:text-3xl">
                  {legacyText("PasswordForm_Login_password_24141")}
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7f6d5d]">
                  {legacyText(
                    "PasswordForm_Keep_your_password_secure_We_recommend_using_a_mix_of_l_d9679",
                  )}
                </p>

                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#a39182]">
                  {legacyText("PasswordForm_Member_ID_7a88b")}{" "}
                  <span className="text-[#483827]">{memberId}</span>
                </p>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-[#d8cec3] bg-white/80 px-5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#483827] transition hover:-translate-y-0.5 hover:border-[#483827] hover:bg-white hover:shadow-[0_12px_28px_rgba(72,56,39,0.08)]"
              >
                <PencilSquareIcon className="h-4 w-4" />
                {legacyText("PasswordForm_Change_64fbd")}
              </button>
            )}
          </div>
        </div>

        {!isEditing ? (
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-center gap-4 rounded-[26px] border border-[#eadfd5] bg-[#f7f3ee]/75 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#8f7b69]">
                <LockClosedIcon className="h-5 w-5 stroke-[1.7]" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-[#483827]">
                  {legacyText("PasswordForm_Password_is_set_9d82f")}
                </p>
                <p className="mt-1 text-sm text-[#8f7b69]">••••••••••••••••</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-5">
              <PasswordInput
                id="current_password"
                label={translation["CURRENT_PASS"]?.[language]}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder={legacyText("PasswordForm_Current_password_19dff")}
                autoComplete="current-password"
              />

              <PasswordInput
                id="new_password"
                label={translation["NEW_PASS"]?.[language]}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={legacyText("PasswordForm_New_password_d850e")}
                autoComplete="new-password"
                error={
                  submitted && !validPassword
                    ? translation["PASS_RULES"]?.[language]
                    : ""
                }
              />

              <PasswordInput
                id="password_confirm"
                label={translation["CONFIRM_PASS"]?.[language]}
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                placeholder={legacyText(
                  "PasswordForm_Confirm_new_password_f8503",
                )}
                autoComplete="new-password"
                error={
                  submitted && !passwordMatch
                    ? translation["PASS_MISMATCH"]?.[language]
                    : ""
                }
              />

              <div className="rounded-[24px] border border-[#eadfd5] bg-[#f7f3ee]/70 p-4">
                <div className="flex gap-3">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#8f7b69]" />
                  <p className="text-sm leading-6 text-[#7f6d5d]">
                    {legacyText(
                      "PasswordForm_After_saving_the_new_password_will_be_used_for_your_nex_db03d",
                    )}
                  </p>
                </div>
              </div>

              {apiErrorMsg && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {apiErrorMsg}
                </p>
              )}
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#d8cec3] bg-white/70 px-6 text-[11px] font-medium uppercase tracking-[0.16em] text-[#7f6d5d] transition hover:bg-white hover:text-[#483827]"
              >
                <XMarkIcon className="h-4 w-4" />
                {translation["CANCEL"]?.[language]}
              </button>

              <button
                type="submit"
                disabled={!canSave}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#483827] px-7 text-[11px] font-medium uppercase tracking-[0.16em] text-white shadow-[0_16px_36px_rgba(72,56,39,0.18)] transition hover:-translate-y-0.5 hover:bg-[#2f241a] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {isLoading
                  ? legacyText("PasswordForm_Saving_ae7e8")
                  : translation["SAVE"]?.[language]}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
