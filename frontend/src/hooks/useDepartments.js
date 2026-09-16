import { useEffect, useState } from "react";
import api from "../api/axios";

export default function useDepartments(firmId, activeOnly = true, revision = 0) {
  const [state, setState] = useState({ items: [], loading: false, error: "", firmId: null });
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
    if (!firmId || controller.signal.aborted) return;
    api.get("/departments", { params: { firmId, activeOnly }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setState({ items: Array.isArray(data) ? data : [], loading: false, error: "", firmId }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ items: [], loading: false, error: error.response?.data?.message || "Could not load departments. Please retry.", firmId }); });
    };
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    setState({ items: [], loading: Boolean(firmId), error: "", firmId });
    load();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [firmId, activeOnly, revision]);
  return state.firmId === firmId ? state : { items: [], loading: Boolean(firmId), error: "" };
}
