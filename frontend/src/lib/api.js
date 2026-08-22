const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("finsight_token");
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("finsight_refresh_token");
}

export function setToken(token, refreshToken) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("finsight_token", token);
  else window.localStorage.removeItem("finsight_token");

  // refreshToken is optional here so setToken(null) (logout) clears both,
  // while a silent-refresh call can update just the access token.
  if (refreshToken !== undefined) {
    if (refreshToken) window.localStorage.setItem("finsight_refresh_token", refreshToken);
    else window.localStorage.removeItem("finsight_refresh_token");
  }
}

let refreshInFlight = null;

/** Exchanges the stored refresh token for a new access token. De-duplicates
 * concurrent callers so a burst of 401s only triggers one network call. */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        setToken(data.accessToken); // refreshToken unchanged, so pass undefined
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Thin fetch wrapper: attaches the JWT, parses JSON, and throws a
 * consistent Error(message) on any non-2xx response so callers can
 * just try/catch instead of checking res.ok everywhere. On a 401 from
 * an expired access token, transparently refreshes once and retries.
 */
export async function apiFetch(path, { method = "GET", body, auth = true, _isRetry = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_isRetry && path !== "/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch(path, { method, body, auth, _isRetry: true });
    }
    // Refresh failed — the session really is over. Clear it so the UI
    // can redirect to login instead of retrying forever.
    setToken(null, null);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    if (data?.details) {
      error.details = data.details;
    }
    throw error;
  }

  return data;
}

export const api = {
  signup: (payload) => apiFetch("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => apiFetch("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => apiFetch("/auth/me"),

  categories: () => apiFetch("/categories"),

  transactions: (params = "") => apiFetch(`/transactions${params}`),
  summary: (params = "") => apiFetch(`/transactions/summary${params}`),
  addTransaction: (payload) => apiFetch("/transactions", { method: "POST", body: payload }),
  updateTransaction: (id, payload) => apiFetch(`/transactions/${id}`, { method: "PATCH", body: payload }),
  deleteTransaction: (id) => apiFetch(`/transactions/${id}`, { method: "DELETE" }),


  budgets: (params = "") => apiFetch(`/budgets${params}`),
  addBudget: (payload) => apiFetch("/budgets", { method: "POST", body: payload }),
  deleteBudget: (id) => apiFetch(`/budgets/${id}`, { method: "DELETE" }),

  goals: () => apiFetch("/goals"),
  addGoal: (payload) => apiFetch("/goals", { method: "POST", body: payload }),
  updateGoal: (id, payload) => apiFetch(`/goals/${id}`, { method: "PATCH", body: payload }),
  deleteGoal: (id) => apiFetch(`/goals/${id}`, { method: "DELETE" }),
  availableSavings: () => apiFetch("/goals/available-savings"),
  allocateSavings: (allocations) => apiFetch("/goals/allocate", { method: "POST", body: { allocations } }),
  goalContributions: (id) => apiFetch(`/goals/${id}/contributions`),

  portfolio: () => apiFetch("/portfolio"),
  addHolding: (payload) => apiFetch("/portfolio", { method: "POST", body: payload }),
  deleteHolding: (id) => apiFetch(`/portfolio/${id}`, { method: "DELETE" }),
  addPortfolioTransaction: (holdingId, payload) =>
    apiFetch(`/portfolio/${holdingId}/transactions`, { method: "POST", body: payload }),
  portfolioTransactions: (holdingId) => apiFetch(`/portfolio/${holdingId}/transactions`),
  updateManualPrice: (holdingId, price) =>
    apiFetch(`/portfolio/${holdingId}/manual-price`, { method: "PATCH", body: { price } }),
  portfolioMarketStatus: () => apiFetch("/portfolio/market-status"),

  healthScore: (params = "") => apiFetch(`/health-score${params}`),
  askAdvisor: (payload) => apiFetch("/insights/ask", { method: "POST", body: payload }),

  aiChat: (payload) => apiFetch("/ai/chat", { method: "POST", body: payload }),
  importStatement: (payload) => apiFetch("/ai/import-statement", { method: "POST", body: payload }),
  parseStatement: (formData) => {
    const token = getToken();
    return fetch(`${API_BASE}/ai/parse-statement`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse statement PDF");
      return data;
    });
  },
};


