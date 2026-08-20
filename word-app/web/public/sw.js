// 最小限のService Worker。
// 初期フェーズではオフライン利用を要件に含めないため、キャッシュは行わず
// ネットワークにそのまま委譲する(PWAとしてインストール可能にするためだけの存在)。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
