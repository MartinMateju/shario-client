"use client";

import { useEffect, useRef, useState } from "react";
import {
  downloadCsvFile,
  getReportErrorMessage,
  isCsvDownloadPayload,
} from "./reports.utils";

/** A response belongs to the filters and authorization context that requested it. */
export default function useReportDownload(trigger, contextKey, t) {
  const current = useRef(contextKey);
  current.current = contextKey;
  const pending = useRef(null);
  const mounted = useRef(false);
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current?.abort?.();
    };
  }, []);
  useEffect(() => {
    pending.current?.abort?.();
    return () => pending.current?.abort?.();
  }, [contextKey]);
  const download = async (args) => {
    if (pending.current) return;
    const owner = current.current;
    setNotice(null);
    const request = trigger(args);
    pending.current = request;
    try {
      const payload = await request.unwrap();
      if (!mounted.current || current.current !== owner) return;
      if (!isCsvDownloadPayload(payload))
        throw new Error(t("export.invalidResponse"));
      downloadCsvFile(payload);
      setNotice({ owner, tone: "success", message: t("export.success") });
    } catch (error) {
      if (mounted.current && current.current === owner)
        setNotice({
          owner,
          tone: "error",
          message: getReportErrorMessage(error, t("export.error")),
        });
    } finally {
      if (pending.current === request) pending.current = null;
    }
  };
  return {
    download,
    notice: notice?.owner === contextKey ? notice : null,
    clearNotice: () => setNotice(null),
  };
}
