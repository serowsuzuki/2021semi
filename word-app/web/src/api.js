/** バックエンドAPIクライアント。AnthropicのAPIキーはサーバー側にのみ存在する。 */

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('サーバーに接続できませんでした。通信環境を確認してください。');
  }

  const text = await response.text();
  const payload = text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text;

  if (!response.ok) {
    throw new Error(payload?.error || `エラーが発生しました (HTTP ${response.status})`);
  }
  return payload;
}

export const api = {
  health: () => request('/api/health'),
  stats: () => request('/api/words/stats'),
  listWords: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== null && value !== '' && value !== false),
    ).toString();
    return request(`/api/words${query ? `?${query}` : ''}`);
  },
  getWord: (id) => request(`/api/words/${id}`),
  createWord: (word) => request('/api/words', { method: 'POST', body: word }),
  updateWord: (id, word) => request(`/api/words/${id}`, { method: 'PUT', body: word }),
  deleteWord: (id) => request(`/api/words/${id}`, { method: 'DELETE' }),
  generate: (headword) => request('/api/words/generate', { method: 'POST', body: { headword } }),
  reviewQueue: (includeAll) => request(`/api/words/review/queue${includeAll ? '?include_all=true' : ''}`),
  submitReview: (id, result) => request(`/api/words/${id}/reviews`, { method: 'POST', body: { result } }),
  exportUrl: (format, status) =>
    `/api/words/export?format=${format}${status ? `&status=${status}` : ''}`,
};

export const emptyWord = () => ({
  headword: '',
  ipa: '',
  core_image: '',
  meanings: [],
  derivatives: [],
  example_sentences: [],
  usage_distinctions: [],
});
