import { useCallback, useEffect, useState } from 'react';
import ListScreen from './screens/ListScreen.jsx';
import AddScreen from './screens/AddScreen.jsx';
import DetailScreen from './screens/DetailScreen.jsx';
import ReviewScreen from './screens/ReviewScreen.jsx';
import Toaster from './components/Toaster.jsx';

/** ハッシュから画面を決める(ブラウザの戻る操作に対応するため)。 */
function parseRoute(hash) {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/add') return { name: 'add' };
  if (path === '/review') return { name: 'review' };
  if (path.startsWith('/word/')) return { name: 'detail', id: path.slice('/word/'.length) };
  return { name: 'list' };
}

export const navigate = (path) => {
  window.location.hash = path;
};

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [toasts, setToasts] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // 保存・削除の成否を必ずUIで確認できるようにする(非機能要件: データ永続化)
  const notify = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, type }]);
    const timeout = type === 'error' ? 6000 : 3000;
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), timeout);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <div className="app">
      {route.name === 'list' && <ListScreen key={reloadKey} notify={notify} />}
      {route.name === 'add' && <AddScreen notify={notify} onSaved={refresh} />}
      {route.name === 'detail' && <DetailScreen id={route.id} notify={notify} onChanged={refresh} />}
      {route.name === 'review' && <ReviewScreen notify={notify} onFinished={refresh} />}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
