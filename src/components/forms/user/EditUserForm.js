import { useState } from "react";
import { useSelector } from "react-redux";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useUpdateUserMutation } from "@/lib/features/users/usersApiSlice";
import Loader from "../../loaders/Loader";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";

export default function EditUserForm({ user, setOpen, showModalConfirm }) {
  const translation = useLegacyTranslation();
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const language = useSelector(selectCurrentLanguage);

  const [email, setEmail] = useState(user.email || "");
  const [outcome, setOutcome] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const copy = (key) => translation[key]?.[language] || translation[key]?.EN;
  const emailChanged =
    email.trim().toLowerCase() !==
    String(user.email || "")
      .trim()
      .toLowerCase();

  const onSaveUserClicked = async (e) => {
    e.preventDefault();
    setSaveError(false);
    try {
      const result = await updateUser({
        id: user.id || user._id,
        email,
      }).unwrap();
      if (result.emailChanged) {
        setOutcome(
          result.verificationEmailStatus === "sent"
            ? "USER_EMAIL_VERIFICATION_SENT"
            : "USER_EMAIL_VERIFICATION_RETRY",
        );
      } else {
        setOpen(false);
        showModalConfirm(true);
      }
    } catch {
      setSaveError(true);
    }
  };

  const onEmailChanged = (e) => setEmail(e.target.value);

  if (isLoading) {
    return <Loader></Loader>;
  } else {
    return (
      <>
        <form
          onSubmit={onSaveUserClicked}
          className="bg-white sm:rounded-none md:col-span-2"
        >
          <div className="space-y-12 sm:space-y-16">
            <div>
              <p className="text-base pl-6 text-left font-medium leading-7 mt-4 max-w-4xl pt-0-5 text-gray-600">
                {`${translation["EDIT_USER"][language]}: ${user._id}, ${user?.firstname} ${user?.lastname}`}
              </p>
              <div className="grid max-w-2xl pl-6 grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-4 md:col-span-2">
                <div className="sm:col-span-2">
                  <input
                    type="email"
                    required
                    aria-label="Email"
                    disabled={Boolean(outcome)}
                    name="email"
                    id="email"
                    value={email}
                    onChange={onEmailChanged}
                    className="block w-full mt-2 rounded-none border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
                  />
                </div>
                {/* <div className="sm:col-span-2">
                    <div className="">
                      <ToggleWithIcon enabled={active} setEnabled={setActive} textLabel={toggleLabel} textDescr={toggleDescr}></ToggleWithIcon>
                    </div>
                  </div> */}
              </div>
              {emailChanged && !outcome ? (
                <p className="px-6 pt-3 text-sm text-ink-muted">
                  {copy("USER_EMAIL_CHANGE_WARNING")}
                </p>
              ) : null}
              {outcome ? (
                <p role="status" className="px-6 pt-3 text-sm">
                  {copy(outcome)}
                </p>
              ) : null}
              {saveError ? (
                <p role="alert" className="px-6 pt-3 text-sm text-red-700">
                  {copy("USER_EMAIL_UPDATE_FAILED")}
                </p>
              ) : null}
              <div className="mt-3 mb-3 pr-2 flex items-center justify-center gap-x-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium leading-6 text-gray-900"
                >
                  {copy(outcome ? "CLOSE" : "CANCEL")}
                </button>
                {!outcome ? (
                  <button
                    type="submit"
                    className="rounded-none bg-[var(--unnamed-color-b3a292)] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-cobalt-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-600"
                  >
                    {translation["SAVE"][language]}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </form>
      </>
    );
  }
}
