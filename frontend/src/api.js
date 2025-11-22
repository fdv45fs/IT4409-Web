export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function request(path, options = {}) {
  const { headers, body, ...rest } = options;

  // Don't set Content-Type for FormData - browser will set it with boundary
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    method: rest.method ?? "GET",
    credentials: rest.credentials ?? "include",
    body,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // ignore if body is empty
  }

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || "Có lỗi xảy ra, hãy thử lại.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function login(credentials) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function register(payload) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refresh() {
  return request("/api/auth/refresh-token", {
    method: "POST",
  });
}

export function logout() {
  return request("/api/auth/logout", {
    method: "POST",
  });
}

export function forgotPassword(email) {
  return request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, newPassword) {
  return request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

// Channel APIs
// Allow passing a custom fetcher (like authFetch) to handle authentication headers
export function getChannels(workspaceId, fetcher = request) {
  const queryString = workspaceId ? `?workspaceId=${workspaceId}` : "";
  return fetcher(`/api/channels${queryString}`);
}

export function getChannelDetails(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}`);
}

export function createChannel(data, fetcher = request) {
  return fetcher("/api/channels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateChannel(channelId, data, fetcher = request) {
  return fetcher(`/api/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function addChannelMember(channelId, data, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getChannelMembers(channelId, fetcher = request) {
  return fetcher(`/api/channels/${channelId}/members`);
}

export function getWorkspaceMembers(workspaceId, fetcher = request) {
  return fetcher(`/api/workspaces/${workspaceId}/members`);
}
