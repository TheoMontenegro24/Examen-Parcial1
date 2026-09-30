const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
export const getToken = () => localStorage.getItem("token");
export const saveSession = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};
export const clearSession = () => localStorage.clear();

export async function api(path, { method = "GET", json, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(API + path, { method, headers, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const d = err.detail;
    throw new Error(typeof d === "string" ? d : "Error en la solicitud");
  }
  return res.status === 204 ? null : res.json();
}

export const fmtDate = (d) => new Date(d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
