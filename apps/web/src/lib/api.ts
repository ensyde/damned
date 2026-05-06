const API_URL =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
    : "";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api${path}`, {
    ...rest,
    headers,
  });

  const data = (await res.json()) as { success: boolean; data?: T; error?: string };

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "Request failed");
  }

  return data.data as T;
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET", token });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE", token });
}
