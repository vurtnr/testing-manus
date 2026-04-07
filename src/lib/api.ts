export interface FileItem {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadStatus: string;
  createdAt: string;
}

export interface Citation {
  index: number;
  chunkId: string;
  fileId: string;
  filename: string;
  fileType: string;
  sourceLocation: Record<string, any>;
  textExcerpt: string;
  confidenceScore: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

// Auth-aware fetch: handles 401 by refreshing token and retrying
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status !== 401) return res;

  // Try refreshing the access token
  const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
  if (refreshRes.ok) {
    return fetch(url, options); // retry original request
  }

  // Refresh failed, redirect to login
  window.location.href = '/login';
  throw new Error('Session expired');
}

export async function uploadFile(file: File): Promise<{ fileId: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authFetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

// Shared SSE stream parser
async function* parseSSEStream(
  res: Response
): AsyncGenerator<{ type: string; data: any }> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          // Skip malformed lines
        }
      }
    }
  }
}

export async function* streamChat(
  message: string,
  conversationId?: string
): AsyncGenerator<{ type: string; data: any }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Chat failed');
  }

  yield* parseSSEStream(res);
}

export async function* streamAgentChat(
  message: string,
  messages: ChatMessage[]
): AsyncGenerator<{ type: string; data: any }> {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, messages }),
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Chat failed');
  }

  yield* parseSSEStream(res);
}

export async function getFiles(): Promise<FileItem[]> {
  const res = await authFetch('/api/files');
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  await authFetch(`/api/files/${fileId}`, { method: 'DELETE' });
}

export async function getEvidence(chunkId: string): Promise<any> {
  const res = await authFetch(`/api/evidence?chunkId=${chunkId}`);
  if (!res.ok) throw new Error('Failed to fetch evidence');
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}
