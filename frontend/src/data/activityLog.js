import { activities as initialActivities } from "./activities";

const STORAGE_KEY = "hrms_activity_log";
const ACTIVITY_EVENT = "hrms:activity-created";
const LEGACY_DEMO_IDS = new Set(["employee-added", "attendance-updated", "salary-finalized"]);

const readActivities = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored)
      ? stored.filter((activity) => !LEGACY_DEMO_IDS.has(activity.id))
      : initialActivities;
  } catch {
    return initialActivities;
  }
};

export const getActivityLog = () => readActivities();

export const addActivity = ({ icon = "history", title, description, path = "/activity" }) => {
  const activity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    icon,
    title,
    description,
    time: new Date().toLocaleString(),
    path,
  };
  const updatedActivities = [activity, ...readActivities()].slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivities));
  window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT, { detail: activity }));
  return activity;
};

export const subscribeToActivities = (listener) => {
  const handleActivity = () => listener(getActivityLog());
  window.addEventListener(ACTIVITY_EVENT, handleActivity);
  window.addEventListener("storage", handleActivity);
  return () => {
    window.removeEventListener(ACTIVITY_EVENT, handleActivity);
    window.removeEventListener("storage", handleActivity);
  };
};
