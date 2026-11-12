"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogTitle } from "@headlessui/react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PlusIcon,
  XMarkIcon,
  NoSymbolIcon,
  EnvelopeIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  useGetRegisteredSenderEmailsQuery,
  useCreateRegisteredSenderEmailMutation,
  useGetRegisteredSenderEmailDetailsQuery,
  useTestRegisteredSenderEmailMutation,
  useDeactivateRegisteredSenderEmailMutation,
} from "@/lib/features/registeredSenderEmails/registeredSenderEmailsApiSlice";

import ConfirmationModalWindow from "@/components/modals/ConfirmationModalWindow";
import {
  WorkspaceEmptyState,
  WorkspaceMobileCard,
  WorkspaceRowActions,
  WorkspaceStatusPill,
  WorkspaceTable,
  WorkspaceTableBody,
  WorkspaceTableCell,
  WorkspaceTableFrame,
  WorkspaceTableHeadCell,
  WorkspaceTableHeader,
  WorkspaceTableRow,
  WorkspaceTableScroller,
  WorkspaceToolbar,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  WorkspaceFormActions,
  workspaceInputClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
  workspaceTextareaClass,
} from "@/components/dashboard/WorkspaceFormSurface";

const providerOptions = [
  { value: "custom", label: "Vlastní SMTP" },
  { value: "gmail", label: "Gmail" },
  { value: "outlook", label: "Outlook / Microsoft" },
  { value: "seznam", label: "Seznam" },
  { value: "resend", label: "Resend" },
  { value: "smtp2go", label: "SMTP2GO" },
];

const providerDefaults = {
  custom: { smtpHost: "", smtpPort: 587, smtpSecure: false },
  gmail: { smtpHost: "smtp.gmail.com", smtpPort: 587, smtpSecure: false },
  outlook: { smtpHost: "smtp.office365.com", smtpPort: 587, smtpSecure: false },
  seznam: { smtpHost: "smtp.seznam.cz", smtpPort: 465, smtpSecure: true },
  resend: { smtpHost: "smtp.resend.com", smtpPort: 587, smtpSecure: false },
  smtp2go: { smtpHost: "mail.smtp2go.com", smtpPort: 587, smtpSecure: false },
};

const emptyForm = {
  email: "",
  displayName: "",
  provider: "custom",
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: "",
  note: "",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function RegisteredSenderEmailsTable({
  guided = false,
  onGuidedSaved,
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [testingEmailId, setTestingEmailId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [emailToDeactivate, setEmailToDeactivate] = useState(null);
  const [guidedCreateDismissed, setGuidedCreateDismissed] = useState(false);

  const {
    data: senderResponse = [],
    isLoading,
    isError,
    refetch,
  } = useGetRegisteredSenderEmailsQuery();
  const senderEmails = useMemo(
    () =>
      Array.isArray(senderResponse)
        ? senderResponse
        : (senderResponse?.senders ?? senderResponse?.items ?? []),
    [senderResponse],
  );

  const { data: selectedEmail, isLoading: isDetailsLoading } =
    useGetRegisteredSenderEmailDetailsQuery(selectedEmailId, {
      skip: !selectedEmailId,
    });

  const [createSenderEmail, { isLoading: isCreating }] =
    useCreateRegisteredSenderEmailMutation();

  const [testSenderEmail] = useTestRegisteredSenderEmailMutation();

  const [deactivateSenderEmail, { isLoading: isDeactivating }] =
    useDeactivateRegisteredSenderEmailMutation();

  const createModalOpen =
    isCreateModalOpen ||
    (guided &&
      !guidedCreateDismissed &&
      !isLoading &&
      !isError &&
      senderEmails.length === 0);

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setGuidedCreateDismissed(true);
    setForm(emptyForm);
    setError("");
    setSuccessMessage("");
  };

  const closeDetailsModal = () => {
    setSelectedEmailId(null);
    setError("");
    setSuccessMessage("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => {
      if (name === "provider") {
        const defaults = providerDefaults[value] || providerDefaults.custom;

        return {
          ...previous,
          provider: value,
          smtpHost: defaults.smtpHost,
          smtpPort: defaults.smtpPort,
          smtpSecure: defaults.smtpSecure,
        };
      }

      return {
        ...previous,
        [name]:
          type === "checkbox"
            ? checked
            : name === "smtpPort"
              ? Number(value)
              : value,
      };
    });
  };

  const validateForm = () => {
    if (!form.email.trim()) return "E-mail je povinný.";
    if (!form.smtpHost.trim()) return "SMTP host je povinný.";
    if (!form.smtpPort) return "SMTP port je povinný.";
    if (!form.smtpUser.trim()) return "SMTP uživatel je povinný.";
    if (!form.smtpPassword.trim()) return "SMTP heslo je povinné.";

    return "";
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccessMessage("");

    const payload = {
      email: form.email.trim().toLowerCase(),
      displayName: form.displayName.trim(),
      provider: form.provider,
      smtpHost: form.smtpHost.trim(),
      smtpPort: Number(form.smtpPort),
      smtpSecure: Boolean(form.smtpSecure),
      smtpUser: form.smtpUser.trim(),
      smtpPassword: form.smtpPassword,
      note: form.note.trim(),
    };

    try {
      await createSenderEmail(payload).unwrap();
      if (guided) {
        const continued = await onGuidedSaved?.();
        if (continued) return;
      }
      closeCreateModal();
      setSuccessMessage(
        "Odesílací e-mail byl uložen. Nyní prosím otestujte SMTP připojení.",
      );
    } catch (err) {
      setError(err?.data?.message || "Nepodařilo se registrovat e-mail.");
    }
  };

  const handleTest = async (item) => {
    setError("");
    setSuccessMessage("");
    setTestingEmailId(item._id);

    let continued = false;
    try {
      await testSenderEmail(item._id).unwrap();

      if (guided) {
        continued = Boolean(await onGuidedSaved?.());
        if (continued) return;
      }

      setSuccessMessage(
        `SMTP připojení pro "${item.email}" bylo úspěšně ověřeno.`,
      );
    } catch (err) {
      setError(err?.data?.message || "SMTP test selhal.");
    } finally {
      if (!continued) setTestingEmailId(null);
    }
  };

  const handleDeactivate = (item) => {
    setError("");
    setSuccessMessage("");

    if (item.automationCount > 0) {
      setError(
        "Tento e-mail nelze deaktivovat, protože je napojený na automatické zprávy.",
      );
      return;
    }

    setEmailToDeactivate(item);
  };

  const confirmDeactivate = async () => {
    if (!emailToDeactivate) return;

    try {
      await deactivateSenderEmail(emailToDeactivate._id).unwrap();

      setSuccessMessage(`E-mail "${emailToDeactivate.email}" byl deaktivován.`);

      setEmailToDeactivate(null);
    } catch (err) {
      setError(err?.data?.message || "Nepodařilo se deaktivovat e-mail.");
    }
  };

  return (
    <>
      <section>
        <WorkspaceTableFrame className="overflow-hidden">
          <WorkspaceToolbar contained className="bg-sand-50/80">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2
                  id="registered-senders-heading"
                  className="text-[14px] font-semibold tracking-[-0.02em] text-ink"
                >
                  Odesílací e-maily
                </h2>
                <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-muted">
                  Přehled odesílacích adres. SMTP hesla se z bezpečnostních
                  důvodů nikdy nezobrazují.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMessage("");
                  setGuidedCreateDismissed(false);
                  setIsCreateModalOpen(true);
                }}
                className={workspacePrimaryButtonClass}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Registrovat e-mail
              </button>
            </div>
          </WorkspaceToolbar>

          {error && (
            <div
              role="alert"
              className="border-b border-danger/20 bg-danger-soft px-5 py-3 text-[13px] text-danger"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="border-b border-success/20 bg-success-soft px-5 py-3 text-[13px] text-success"
            >
              {successMessage}
            </div>
          )}

          <div className="border-b border-line bg-white px-4 py-3 sm:px-5">
            <p className="text-[12px] text-ink-muted" aria-live="polite">
              Zobrazeno{" "}
              <span className="font-semibold text-ink">
                {senderEmails.length}
              </span>{" "}
              odesílacích e-mailů
            </p>
          </div>

          {isLoading && <EmptyState text="Načítám e-maily..." />}

          {isError && (
            <div
              role="alert"
              className="px-4 py-12 text-center text-[13px] text-danger"
            >
              Nepodařilo se načíst odesílací e-maily.{" "}
              <button
                type="button"
                onClick={refetch}
                className="font-semibold underline underline-offset-4"
              >
                Zkusit znovu
              </button>
            </div>
          )}

          {!isLoading && !isError && senderEmails.length === 0 && (
            <WorkspaceEmptyState
              contained
              icon={EnvelopeIcon}
              title="Zatím zde nejsou žádné odesílací e-maily"
              description="Zaregistrujte první SMTP e-mail, ze kterého se budou zprávy odesílat."
            />
          )}

          {!isLoading && !isError && senderEmails.length > 0 && (
            <>
              <div className="grid gap-3 bg-canvas p-3 sm:hidden">
                {senderEmails.map((item) => (
                  <SenderEmailMobileCard
                    key={item._id}
                    item={item}
                    onDetail={() => setSelectedEmailId(item._id)}
                    onTest={() => handleTest(item)}
                    onDeactivate={() => handleDeactivate(item)}
                    isTesting={testingEmailId === item._id}
                    isDeactivating={isDeactivating}
                  />
                ))}
              </div>

              <WorkspaceTableScroller
                ariaLabel="Odesílací e-maily"
                className="hidden sm:block"
              >
                <WorkspaceTable
                  aria-label="Odesílací e-maily"
                  className="min-w-[1200px]"
                >
                  <WorkspaceTableHeader>
                    <tr>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>SMTP</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Napojené zprávy</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Registrováno</TableHead>
                      <TableHead align="right">Akce</TableHead>
                    </tr>
                  </WorkspaceTableHeader>

                  <WorkspaceTableBody>
                    {senderEmails.map((item) => (
                      <SenderEmailRow
                        key={item._id}
                        item={item}
                        onDetail={() => setSelectedEmailId(item._id)}
                        onTest={() => handleTest(item)}
                        onDeactivate={() => handleDeactivate(item)}
                        isTesting={testingEmailId === item._id}
                        isDeactivating={isDeactivating}
                      />
                    ))}
                  </WorkspaceTableBody>
                </WorkspaceTable>
              </WorkspaceTableScroller>
            </>
          )}
        </WorkspaceTableFrame>
      </section>

      <CreateSenderEmailModal
        open={createModalOpen}
        form={form}
        error={error}
        isCreating={isCreating}
        onClose={closeCreateModal}
        onChange={handleChange}
        onSubmit={handleCreate}
        guided={guided}
      />

      <SenderEmailDetailModal
        open={Boolean(selectedEmailId)}
        selectedEmail={selectedEmail}
        isLoading={isDetailsLoading}
        onClose={closeDetailsModal}
      />

      <ConfirmationModalWindow
        open={Boolean(emailToDeactivate)}
        title="Deaktivovat odesílací e-mail?"
        description="Opravdu chcete deaktivovat e-mail"
        highlightedText={emailToDeactivate?.email}
        infoText="E-mail nebude smazán. Pouze bude označen jako neaktivní a nebude jej možné dále používat."
        confirmLabel="Ano, deaktivovat"
        loadingLabel="Deaktivuji..."
        variant="danger"
        isLoading={isDeactivating}
        onClose={() => setEmailToDeactivate(null)}
        onConfirm={confirmDeactivate}
      />
    </>
  );
}

function SenderEmailRow({
  item,
  onDetail,
  onTest,
  onDeactivate,
  isTesting,
  isDeactivating,
}) {
  return (
    <WorkspaceTableRow className="align-top">
      <TableCell as="th" scope="row" strong>
        <div>
          <p>{item.displayName || item.email}</p>
          {item.displayName ? (
            <p className="mt-1 text-[11px] font-normal text-ink-muted">
              {item.email}
            </p>
          ) : null}
        </div>
      </TableCell>

      <TableCell>{getProviderLabel(item.provider)}</TableCell>

      <TableCell>
        <div>
          <p className="font-semibold text-ink">
            {item.smtpHost || "—"}:{item.smtpPort || "—"}
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            {item.smtpSecure ? "SSL / secure" : "STARTTLS / non-secure"}
          </p>
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-1.5">
          <TestStatusBadge status={item.lastTestStatus} />
          {item.lastTestedAt ? (
            <p className="text-[11px] text-ink-muted">
              {new Date(item.lastTestedAt).toLocaleString("cs-CZ")}
            </p>
          ) : null}
        </div>
      </TableCell>

      <TableCell>{item.automationCount || 0}</TableCell>

      <TableCell>
        <StatusBadge active={item.isActive}>
          {item.isActive ? "Aktivní" : "Neaktivní"}
        </StatusBadge>
      </TableCell>

      <TableCell>{formatDate(item.createdAt)}</TableCell>

      <WorkspaceTableCell className="text-right">
        <WorkspaceRowActions>
          <IconButton onClick={onDetail} label="Detail">
            <EyeIcon className="h-4 w-4" />
          </IconButton>

          <IconButton
            onClick={onTest}
            disabled={!item.isActive || isTesting}
            label="Test SMTP"
          >
            <ArrowPathIcon
              className={cx("h-4 w-4", isTesting && "animate-spin")}
            />
          </IconButton>

          <IconButton
            onClick={onDeactivate}
            disabled={!item.isActive || isDeactivating}
            label="Deaktivovat"
            danger
          >
            <NoSymbolIcon className="h-4 w-4" />
          </IconButton>
        </WorkspaceRowActions>
      </WorkspaceTableCell>
    </WorkspaceTableRow>
  );
}

function SenderEmailMobileCard({
  item,
  onDetail,
  onTest,
  onDeactivate,
  isTesting,
  isDeactivating,
}) {
  return (
    <WorkspaceMobileCard
      title={item.displayName || item.email}
      subtitle={item.displayName ? item.email : getProviderLabel(item.provider)}
      status={
        <StatusBadge active={item.isActive}>
          {item.isActive ? "Aktivní" : "Neaktivní"}
        </StatusBadge>
      }
      actions={
        <>
          <MobileActionButton
            icon={<EyeIcon className="h-4 w-4" />}
            onClick={onDetail}
          >
            Detail
          </MobileActionButton>
          <MobileActionButton
            icon={
              <ArrowPathIcon
                className={cx("h-4 w-4", isTesting && "animate-spin")}
              />
            }
            onClick={onTest}
            disabled={!item.isActive || isTesting}
          >
            Test
          </MobileActionButton>
          <MobileActionButton
            icon={<NoSymbolIcon className="h-4 w-4" />}
            onClick={onDeactivate}
            disabled={!item.isActive || isDeactivating}
            danger
          >
            Vypnout
          </MobileActionButton>
        </>
      }
    >
      <dl className="space-y-2">
        <InfoLine label="Provider" value={getProviderLabel(item.provider)} />
        <InfoLine
          label="SMTP"
          value={`${item.smtpHost || "—"}:${item.smtpPort || "—"}`}
        />
        <InfoLine
          label="Test"
          value={getTestStatusLabel(item.lastTestStatus)}
        />
        <InfoLine
          label="Naposledy testováno"
          value={
            item.lastTestedAt
              ? new Date(item.lastTestedAt).toLocaleString("cs-CZ")
              : "—"
          }
        />
        <InfoLine label="Napojené zprávy" value={item.automationCount || 0} />
        <InfoLine label="Registrováno" value={formatDate(item.createdAt)} />
      </dl>
    </WorkspaceMobileCard>
  );
}

function CreateSenderEmailModal({
  open,
  form,
  error,
  isCreating,
  onClose,
  onChange,
  onSubmit,
  guided = false,
}) {
  const setupT = useTranslations("SetupCenter");
  const selectedProvider = useMemo(
    () => providerOptions.find((option) => option.value === form.provider),
    [form.provider],
  );

  return (
    <Dialog open={open} as="div" className="relative z-[110]" onClose={onClose}>
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport>
        <WorkspaceDialogPanel
          size="large"
          data-guided-form={guided ? "communications" : undefined}
        >
          <ModalHeader title="Registrovat odesílací e-mail" onClose={onClose} />

          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-[16px] border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger"
                >
                  {error}
                </div>
              )}

              <div className="rounded-[20px] border border-line bg-sand-50 p-4">
                <div className="flex items-start gap-3">
                  <ServerIcon className="mt-0.5 h-5 w-5 text-cobalt-600" />

                  <div>
                    <h4 className="text-[13px] font-semibold text-ink">
                      SMTP nastavení
                    </h4>

                    <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                      Po uložení e-mail otestujte. Automatické zprávy by měly
                      používat pouze ověřené odesílací adresy.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={guided ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}
              >
                <Input
                  label="Odesílací e-mail"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="např. info@studio.cz"
                  required
                />

                {!guided ? (
                  <Input
                    label="Zobrazované jméno"
                    name="displayName"
                    value={form.displayName}
                    onChange={onChange}
                    placeholder="např. Název vašeho studia"
                  />
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Provider"
                  name="provider"
                  value={form.provider}
                  onChange={onChange}
                  options={providerOptions}
                />

                <Input
                  label="SMTP uživatel"
                  name="smtpUser"
                  value={form.smtpUser}
                  onChange={onChange}
                  placeholder="často stejný jako e-mail"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <Input
                  label="SMTP host"
                  name="smtpHost"
                  value={form.smtpHost}
                  onChange={onChange}
                  placeholder="např. smtp.gmail.com"
                  required
                />

                <Input
                  label="SMTP port"
                  name="smtpPort"
                  type="number"
                  min="1"
                  max="65535"
                  value={form.smtpPort}
                  onChange={onChange}
                  required
                />
              </div>

              <label className="flex items-start justify-between gap-4 rounded-[16px] border border-line bg-sand-50 px-4 py-3">
                <span>
                  <span className="block text-[13px] font-semibold text-ink">
                    Secure SMTP
                  </span>

                  <span className="mt-0.5 block text-[12px] leading-5 text-ink-muted">
                    Zapněte pro port 465. Pro port 587 obvykle vypnuto.
                  </span>
                </span>

                <input
                  type="checkbox"
                  name="smtpSecure"
                  checked={form.smtpSecure}
                  onChange={onChange}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500"
                />
              </label>

              <Input
                label="SMTP heslo / app password"
                name="smtpPassword"
                type="password"
                value={form.smtpPassword}
                onChange={onChange}
                placeholder="Doporučeno: app password"
                required
              />

              {!guided ? (
                <>
                  <label className="block">
                    <FieldLabel>Poznámka</FieldLabel>

                    <textarea
                      name="note"
                      value={form.note}
                      onChange={onChange}
                      rows={4}
                      className={workspaceTextareaClass}
                      placeholder="Např. hlavní e-mail pro automatické zprávy"
                    />
                  </label>

                  <div className="rounded-[16px] border border-line bg-sand-50 px-4 py-3 text-[12px] leading-5 text-ink-muted">
                    Vybraný provider:{" "}
                    <span className="font-semibold text-ink">
                      {selectedProvider?.label || "Vlastní SMTP"}
                    </span>
                    . SMTP heslo se v administraci nebude nikdy zobrazovat.
                  </div>
                </>
              ) : null}
            </div>
            <WorkspaceFormActions>
              <SecondaryButton onClick={onClose}>Zrušit</SecondaryButton>

              <PrimaryButton type="submit" disabled={isCreating}>
                {isCreating
                  ? "Ukládám..."
                  : guided
                    ? setupT("guided.saveAndContinue")
                    : "Registrovat e-mail"}
              </PrimaryButton>
            </WorkspaceFormActions>
          </form>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

function SenderEmailDetailModal({ open, selectedEmail, isLoading, onClose }) {
  return (
    <Dialog open={open} as="div" className="relative z-[110]" onClose={onClose}>
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport>
        <WorkspaceDialogPanel size="large">
          <ModalHeader title="Detail odesílacího e-mailu" onClose={onClose} />

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {isLoading && (
              <div
                role="status"
                className="rounded-[16px] border border-line bg-sand-50 px-4 py-4 text-[13px] text-ink-muted"
              >
                Načítám detail...
              </div>
            )}

            {!isLoading && selectedEmail && (
              <>
                <dl className="grid gap-2 rounded-[20px] border border-line bg-sand-50 p-4 text-[13px] text-ink-soft sm:grid-cols-2">
                  <InfoLine label="E-mail" value={selectedEmail.email} />
                  <InfoLine
                    label="Zobrazované jméno"
                    value={selectedEmail.displayName || "—"}
                  />
                  <InfoLine
                    label="Provider"
                    value={getProviderLabel(selectedEmail.provider)}
                  />
                  <InfoLine
                    label="SMTP host"
                    value={selectedEmail.smtpHost || "—"}
                  />
                  <InfoLine
                    label="SMTP port"
                    value={selectedEmail.smtpPort || "—"}
                  />
                  <InfoLine
                    label="Secure"
                    value={selectedEmail.smtpSecure ? "Ano" : "Ne"}
                  />
                  <InfoLine
                    label="SMTP uživatel"
                    value={selectedEmail.smtpUser || "—"}
                  />
                  <InfoLine
                    label="Test SMTP"
                    value={getTestStatusLabel(selectedEmail.lastTestStatus)}
                  />
                  <InfoLine
                    label="Naposledy testováno"
                    value={
                      selectedEmail.lastTestedAt
                        ? new Date(selectedEmail.lastTestedAt).toLocaleString(
                            "cs-CZ",
                          )
                        : "—"
                    }
                  />
                  <InfoLine
                    label="Poznámka"
                    value={selectedEmail.note || "—"}
                  />
                  <InfoLine
                    label="Stav"
                    value={selectedEmail.isActive ? "Aktivní" : "Neaktivní"}
                  />
                  <InfoLine
                    label="Registrováno"
                    value={
                      selectedEmail.createdAt
                        ? new Date(selectedEmail.createdAt).toLocaleString(
                            "cs-CZ",
                          )
                        : "—"
                    }
                  />
                </dl>

                <div className="mt-6">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
                    Napojené automatické zprávy
                  </h4>

                  <div className="mt-3 space-y-2">
                    {selectedEmail.automations?.length > 0 ? (
                      selectedEmail.automations.map((automation) => (
                        <div
                          key={automation._id}
                          className="rounded-[16px] border border-line bg-white px-4 py-3 shadow-xs"
                        >
                          <p className="text-[13px] font-semibold text-ink">
                            {automation.name}
                          </p>
                          <p className="mt-1 text-[12px] text-ink-soft">
                            {automation.subject}
                          </p>
                          <p className="mt-1 text-[11px] text-ink-muted">
                            {automation.scheduleType} ·{" "}
                            {automation.isActive ? "Aktivní" : "Neaktivní"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[16px] border border-line bg-sand-50 px-4 py-4 text-[13px] text-ink-muted">
                        Tento e-mail zatím není napojený na žádnou automatickou
                        zprávu.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
      <DialogTitle className="text-lg font-semibold tracking-[-0.025em] text-ink sm:text-xl">
        {title}
      </DialogTitle>

      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink-muted transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25"
        aria-label="Zavřít"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <input {...props} className={workspaceInputClass} />
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <select {...props} className={workspaceInputClass}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldLabel({ children }) {
  return (
    <span className="block text-[12px] font-semibold leading-5 text-ink-soft">
      {children}
    </span>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <WorkspaceTableHeadCell className={align === "right" ? "text-right" : ""}>
      {children}
    </WorkspaceTableHeadCell>
  );
}

function TableCell({ children, strong, ...props }) {
  return (
    <WorkspaceTableCell
      {...props}
      className={cx(strong && "font-semibold text-ink")}
    >
      {children || "—"}
    </WorkspaceTableCell>
  );
}

function StatusBadge({ children, active }) {
  return (
    <WorkspaceStatusPill tone={active ? "success" : "neutral"}>
      {children}
    </WorkspaceStatusPill>
  );
}

function TestStatusBadge({ status }) {
  const normalizedStatus = status || "untested";

  const config = {
    success: {
      label: "Ověřeno",
      tone: "success",
      icon: CheckCircleIcon,
    },
    failed: {
      label: "Selhalo",
      tone: "danger",
      icon: NoSymbolIcon,
    },
    untested: {
      label: "Netestováno",
      tone: "neutral",
      icon: ClockIcon,
    },
  };

  const item = config[normalizedStatus] || config.untested;
  const Icon = item.icon;

  return (
    <WorkspaceStatusPill tone={item.tone} className="gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </WorkspaceStatusPill>
  );
}

function IconButton({ children, onClick, disabled, label, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex items-center justify-center rounded-full border bg-white transition disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-danger/20 text-danger hover:bg-danger-soft"
          : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function MobileActionButton({
  children,
  icon,
  onClick,
  disabled,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border bg-white px-3 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-danger/20 text-danger hover:bg-danger-soft"
          : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function PrimaryButton({ children, disabled, type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={workspacePrimaryButtonClass}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={workspaceSecondaryButtonClass}
    >
      {children}
    </button>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
      <dt className="font-semibold text-ink">{label}</dt>
      <dd className="break-words text-right text-ink-soft">{value || "—"}</dd>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      role="status"
      className="px-4 py-12 text-center text-[13px] text-ink-muted"
    >
      {text}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("cs-CZ");
}

function getProviderLabel(value) {
  return (
    providerOptions.find((provider) => provider.value === value)?.label ||
    "Vlastní SMTP"
  );
}

function getTestStatusLabel(status) {
  if (status === "success") return "Ověřeno";
  if (status === "failed") return "Selhalo";
  return "Netestováno";
}
