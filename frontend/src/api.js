export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function request(path, options = {}) {
  const { headers, body, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method: rest.method ?? "GET",
    credentials: rest.credentials ?? "include",
    body,
    headers: {
      "Content-Type": "application/json",
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