import { mockApiFetch } from "./mock-api";
import { isMockMode } from "./mock-mode";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api";

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (isMockMode()) {
    return mockApiFetch<T>(path, options);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload?.message ?? "요청 처리에 실패했습니다.");
  }

  return response.json() as Promise<T>;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
