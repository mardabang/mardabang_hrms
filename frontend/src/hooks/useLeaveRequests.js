import { useEffect, useState } from "react";
import api from "../api/axios";

export const leaveError = error => error?.response?.data?.message || "Could not reach leave management. Please try again.";

export default function useLeaveRequests({ mine, firmCode, enabled = true, revision = 0 }) {
  const key = `${mine}:${firmCode || ""}:${enabled}`;
  const [result, setResult] = useState({ key: "", records: [] });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setLoading(enabled);
    if (!enabled) return () => controller.abort();
    api.get("/leaves", {
      params: { mine, ...(firmCode ? { firmCode } : {}) }, signal: controller.signal,
    }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error("Invalid leave response");
      setResult({ key, records: data });
    }).catch(err => {
      if (!controller.signal.aborted) { setResult({ key, records: [] }); setError(leaveError(err)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [key, mine, firmCode, enabled, revision]);
  return { records: result.key === key ? result.records : [], loading, error };
}
