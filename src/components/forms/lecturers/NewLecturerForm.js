"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useCreateNewLecturerMutation } from "@/lib/features/lecturers/lecturersApiSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { AcademicCapIcon } from "@heroicons/react/24/outline";
import translation from "@/translations/translation";
import Loader from "../../loaders/Loader";
import TextInput from "@/components/inputs/TextInput";
import SubmitButton from "@/components/buttons/SubmitButton";
import CancelButton from "@/components/buttons/CancelButton";
import TextArea from "@/components/textareas/TextArea";

const INITIAL_FORM = {
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  description: "",
};

export default function NewLecturerForm({
  show,
  setShow,
  showConfirmation,
  showErrModal,
  setErrMsg,
}) {
  const [createNewLecturer, { isLoading, isSuccess, isError, error }] =
    useCreateNewLecturerMutation();

  const { id: userId, isAdmin } = useSelector(selectCurrentUser);
  const language = useSelector(selectCurrentLanguage);

  const [form, setForm] = useState(INITIAL_FORM);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
  }, []);

  useEffect(() => {
    if (show) {
      resetForm();
    }
  }, [show, resetForm]);

  useEffect(() => {
    if (isSuccess) {
      resetForm();
      setShow(false);
      showConfirmation(true);
    }

    if (isError || error) {
      setShow(false);
      showErrModal(true);
      setErrMsg(
        error?.data?.message || "Nepodařilo se vytvořit nového lektora.",
      );
    }
  }, [
    isSuccess,
    isError,
    error,
    resetForm,
    setShow,
    showConfirmation,
    showErrModal,
    setErrMsg,
  ]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onCancelClicked = () => {
    resetForm();
    setShow(false);
  };

  const onSubmitClicked = async (e) => {
    e.preventDefault();

    await createNewLecturer({
      firstname: form.firstname,
      lastname: form.lastname,
      email: form.email,
      phone: form.phone,
      description: form.description,
      isAdmin,
      userId,
    });
  };

  if (!show) return null;

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-[#FCFBF9] shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="border-b border-black/5 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--unnamed-color-b3a292)]/20 bg-[var(--unnamed-color-b3a292)]/8 text-[var(--unnamed-color-b3a292)]">
            <AcademicCapIcon className="h-5 w-5" />
          </div>

          <div>
            <h3 className="mt-1 text-lg sm:text-xl font-medium text-black">
              Nový lektor
            </h3>
            <p className="mt-1 text-sm text-black/55">
              Vyplňte základní údaje pro vytvoření nového lektora.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmitClicked} className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-5">
          <div className="rounded-[22px] border border-black/5 bg-white p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextInput
                htmlFor="firstname"
                key="firstname"
                name="firstname"
                label={translation["FIRST_NAME"][language]}
                id="firstname"
                data="firstname"
                value={form.firstname}
                type="text"
                callback={(e) => updateField("firstname", e.target.value)}
                autoComplete="off"
                className="w-full"
                isMandatory={true}
              />

              <TextInput
                htmlFor="lastname"
                key="lastname"
                name="lastname"
                label={translation["LAST_NAME"][language]}
                id="lastname"
                data="lastname"
                type="text"
                value={form.lastname}
                callback={(e) => updateField("lastname", e.target.value)}
                autoComplete="off"
                className="w-full"
                isMandatory={true}
              />

              <TextInput
                htmlFor="email"
                key="email"
                name="email"
                label={translation["EMAIL"][language]}
                id="email"
                data="email"
                type="text"
                value={form.email}
                callback={(e) => updateField("email", e.target.value)}
                autoComplete="off"
                className="w-full"
                isMandatory={true}
              />

              <TextInput
                htmlFor="phone"
                key="phone"
                name="phone"
                label={translation["PHONE"][language]}
                id="phone"
                data="phone"
                type="number"
                value={form.phone}
                callback={(e) => updateField("phone", e.target.value)}
                autoComplete="off"
                className="w-full"
                isMandatory={true}
              />
            </div>

            <div className="mt-4">
              <TextArea
                className="w-full"
                onChange={(e) => updateField("description", e.target.value)}
                value={form.description}
                label={translation["DESCRIPTION"][language]}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <div className="w-full sm:w-auto">
              <CancelButton
                onClick={onCancelClicked}
                text={translation["CANCEL"][language]}
              />
            </div>

            <div className="w-full sm:w-auto">
              <SubmitButton
                onClick={onSubmitClicked}
                text={translation["ADD"][language]}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
