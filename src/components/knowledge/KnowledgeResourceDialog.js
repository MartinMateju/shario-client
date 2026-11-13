"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  Modal,
  StatusBanner,
  Toggle,
} from "@/components/communications/CommunicationsPrimitives";
import {
  useCreateKnowledgeResourceMutation,
  useUpdateKnowledgeResourceMutation,
} from "@/lib/features/knowledge/knowledgeApiSlice";

import {
  KNOWLEDGE_AUDIENCES,
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_RESOURCE_TYPES,
  KNOWLEDGE_STATUSES,
  buildKnowledgePayload,
  createBlankKnowledgeForm,
  getKnowledgeId,
  getYoutubeVideoId,
  normalizeKnowledgeForm,
} from "./knowledge.utils";

const fieldClass =
  "mt-1.5 w-full rounded-[14px] border-line bg-white text-sm text-ink focus:border-cobalt-300 focus:ring-cobalt-200";

const getErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

function CheckboxGrid({
  label,
  hint,
  options,
  selected,
  onToggle,
  emptyLabel,
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-ink-muted">{label}</legend>
      {hint ? <p className="mt-1 text-[11px] text-ink-subtle">{hint}</p> : null}
      {options.length ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2 rounded-[12px] border border-line px-3 py-2 text-xs text-ink"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => onToggle(option.id)}
                className="rounded border-line text-cobalt-500 focus:ring-cobalt-200"
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-[12px] bg-sand-50 px-3 py-2 text-xs text-ink-muted">
          {emptyLabel}
        </p>
      )}
    </fieldset>
  );
}

export default function KnowledgeResourceDialog({
  open,
  onClose,
  resource,
  canPublish,
  locations = [],
  membershipOptions = [],
  courseOptions = [],
}) {
  const t = useTranslations("KnowledgeHub");
  const [form, setForm] = useState(() =>
    resource ? normalizeKnowledgeForm(resource) : createBlankKnowledgeForm(),
  );
  const [feedback, setFeedback] = useState("");
  const [createResource, createState] = useCreateKnowledgeResourceMutation();
  const [updateResource, updateState] = useUpdateKnowledgeResourceMutation();
  const isSaving = createState.isLoading || updateState.isLoading;

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const toggleListValue = (key, id) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((value) => value !== id)
        : [...current[key], id],
    }));
  };

  const updateQuestion = (index, key, value) => {
    setForm((current) => ({
      ...current,
      customQuestions: current.customQuestions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const removeQuestion = (index) => {
    setForm((current) => ({
      ...current,
      customQuestions: current.customQuestions.filter(
        (_item, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback("");

    if (form.type === "video" && !getYoutubeVideoId(form.videoUrl)) {
      setFeedback(t("form.invalidYoutube"));
      return;
    }

    const payload = buildKnowledgePayload(form);
    if (
      form.type === "faq" &&
      !payload.content &&
      payload.customQuestions.length === 0
    ) {
      setFeedback(t("form.faqContentRequired"));
      return;
    }

    try {
      const id = getKnowledgeId(resource);
      if (id) {
        await updateResource({ id, ...payload }).unwrap();
      } else {
        await createResource(payload).unwrap();
      }
      onClose();
    } catch (error) {
      setFeedback(getErrorMessage(error, t("form.saveError")));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resource ? t("form.editTitle") : t("form.createTitle")}
      description={t("form.description")}
      size="xl"
    >
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-11rem)] space-y-5 overflow-y-auto p-5 sm:p-6"
      >
        {feedback ? <StatusBanner tone="error">{feedback}</StatusBanner> : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.title")}
            <input
              value={form.title}
              onChange={update("title")}
              required
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.type")}
            <select
              value={form.type}
              onChange={update("type")}
              className={fieldClass}
            >
              {KNOWLEDGE_RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs font-medium text-ink-muted">
          {t("fields.summary")}
          <textarea
            value={form.summary}
            onChange={update("summary")}
            rows={2}
            className={fieldClass}
            placeholder={t("form.summaryPlaceholder")}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.category")}
            <select
              value={form.category}
              onChange={update("category")}
              className={fieldClass}
            >
              {KNOWLEDGE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.language")}
            <select
              value={form.language}
              onChange={update("language")}
              className={fieldClass}
            >
              <option value="en">English</option>
              <option value="cs">Čeština</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.audience")}
            <select
              value={form.audience}
              onChange={update("audience")}
              className={fieldClass}
            >
              {KNOWLEDGE_AUDIENCES.map((audience) => (
                <option key={audience} value={audience}>
                  {t(`audiences.${audience}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.status")}
            <select
              value={form.status}
              onChange={update("status")}
              className={fieldClass}
            >
              {KNOWLEDGE_STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={status === "published" && !canPublish}
                >
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.audience === "member" ? (
          <CheckboxGrid
            label={t("fields.memberships")}
            hint={t("form.membershipsHint")}
            options={membershipOptions}
            selected={form.targetMembershipIds}
            onToggle={(id) => toggleListValue("targetMembershipIds", id)}
            emptyLabel={t("form.noMemberships")}
          />
        ) : null}

        {form.audience === "course" ? (
          <CheckboxGrid
            label={t("fields.courses")}
            hint={t("form.coursesHint")}
            options={courseOptions}
            selected={form.targetCourseIds}
            onToggle={(id) => toggleListValue("targetCourseIds", id)}
            emptyLabel={t("form.noCourses")}
          />
        ) : null}

        {form.type === "video" ? (
          <>
            <label className="block text-xs font-medium text-ink-muted">
              {t("fields.videoUrl")}
              <input
                type="url"
                value={form.videoUrl}
                onChange={update("videoUrl")}
                required
                placeholder="https://www.youtube.com/watch?v=…"
                className={fieldClass}
              />
              <span className="mt-1 block text-[11px] text-ink-subtle">
                {t("form.youtubeHint")}
              </span>
            </label>
            <label className="block text-xs font-medium text-ink-muted">
              {t("fields.transcript")}
              <textarea
                value={form.transcript}
                onChange={update("transcript")}
                rows={6}
                className={fieldClass}
                placeholder={t("form.transcriptPlaceholder")}
              />
            </label>
          </>
        ) : null}

        {["guide", "faq", "video", "link", "file"].includes(form.type) ? (
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.content")}
            <textarea
              value={form.content}
              onChange={update("content")}
              required={form.type === "guide"}
              rows={7}
              className={fieldClass}
              placeholder={t("form.contentPlaceholder")}
            />
          </label>
        ) : null}

        {form.type === "link" ? (
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.sourceUrl")}
            <input
              type="url"
              value={form.sourceUrl}
              onChange={update("sourceUrl")}
              required
              placeholder="https://"
              className={fieldClass}
            />
          </label>
        ) : null}

        {form.type === "file" ? (
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.fileUrl")}
            <input
              value={form.fileUrl}
              onChange={update("fileUrl")}
              required
              placeholder="https://"
              className={fieldClass}
            />
            <span className="mt-1 block text-[11px] text-ink-subtle">
              {t("form.fileHint")}
            </span>
          </label>
        ) : null}

        <label className="block text-xs font-medium text-ink-muted">
          {t("fields.tags")}
          <input
            value={form.tags}
            onChange={update("tags")}
            placeholder={t("form.tagsPlaceholder")}
            className={fieldClass}
          />
        </label>

        <CheckboxGrid
          label={t("fields.locations")}
          hint={t("form.locationsHint")}
          options={locations}
          selected={form.locationIds}
          onToggle={(id) => toggleListValue("locationIds", id)}
          emptyLabel={t("form.noLocations")}
        />

        <section className="rounded-[18px] border border-line bg-sand-50/55 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                {t("form.questionsTitle")}
              </h3>
              <p className="mt-1 text-xs text-ink-muted">
                {t("form.questionsDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  customQuestions: [
                    ...current.customQuestions,
                    { question: "", answer: "" },
                  ],
                }))
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink"
            >
              <PlusIcon className="h-4 w-4" />
              {t("actions.addQuestion")}
            </button>
          </div>

          {form.customQuestions.length ? (
            <div className="mt-4 space-y-3">
              {form.customQuestions.map((item, index) => (
                <div
                  key={index}
                  className="rounded-[16px] border border-line bg-white p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-ink-muted">
                        {t("fields.question")}
                        <input
                          value={item.question}
                          onChange={(event) =>
                            updateQuestion(
                              index,
                              "question",
                              event.target.value,
                            )
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-xs font-medium text-ink-muted">
                        {t("fields.answer")}
                        <textarea
                          value={item.answer}
                          onChange={(event) =>
                            updateQuestion(index, "answer", event.target.value)
                          }
                          rows={2}
                          className={fieldClass}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="mt-5 rounded-full p-2 text-ink-muted hover:bg-danger-soft hover:text-danger"
                      aria-label={t("actions.removeQuestion")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 rounded-[18px] border border-line p-4 sm:grid-cols-2">
          <Toggle
            checked={form.featured}
            onChange={(featured) =>
              setForm((current) => ({ ...current, featured }))
            }
            label={t("fields.featured")}
            description={t("form.featuredHint")}
          />
          <Toggle
            checked={form.aiEnabled}
            onChange={(aiEnabled) =>
              setForm((current) => ({ ...current, aiEnabled }))
            }
            label={t("fields.aiEnabled")}
            description={t("form.aiHint")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.effectiveFrom")}
            <input
              type="datetime-local"
              value={form.effectiveFrom}
              onChange={update("effectiveFrom")}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-medium text-ink-muted">
            {t("fields.effectiveUntil")}
            <input
              type="datetime-local"
              value={form.effectiveUntil}
              min={form.effectiveFrom || undefined}
              onChange={update("effectiveUntil")}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-xs font-semibold text-ink"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-cobalt-500 px-5 py-2.5 text-xs font-semibold text-white shadow-cobalt disabled:opacity-50"
          >
            {isSaving ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
