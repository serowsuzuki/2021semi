import { useState } from 'react';
import { api, emptyWord } from '../api.js';
import { navigate } from '../App.jsx';
import Header from '../components/Header.jsx';
import WordView from '../components/WordView.jsx';
import WordForm from '../components/WordForm.jsx';

/**
 * 単語登録(要件 4.1)
 * 入力 → AIが情報を自動生成 → プレビューで確認 → 登録
 * プレビュー時点では編集しない(要件どおり)。手入力モードも用意している。
 */
export default function AddScreen({ notify, onSaved }) {
  const [headword, setHeadword] = useState('');
  const [generated, setGenerated] = useState(null);
  const [manual, setManual] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async (event) => {
    event.preventDefault();
    const word = headword.trim();
    if (!word) return;
    setGenerating(true);
    try {
      setGenerated(await api.generate(word));
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const save = async (word) => {
    setSaving(true);
    try {
      const created = await api.createWord(word);
      notify(`「${created.headword}」を登録しました`);
      onSaved?.();
      navigate(`/word/${created.id}`);
    } catch (error) {
      // 保存に失敗しても入力内容は保持したままにする
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (manual) {
    return (
      <>
        <Header title="手入力で登録" back="/" />
        <WordForm
          initialWord={{ ...emptyWord(), headword: headword.trim() }}
          submitLabel="登録する"
          busy={saving}
          onSubmit={save}
          onCancel={() => setManual(false)}
        />
      </>
    );
  }

  if (generated) {
    return (
      <>
        <Header title="内容を確認" back="/" />
        <p className="notice">AIが生成した内容です。問題なければ登録してください(登録後に編集できます)。</p>
        <WordView word={generated} />
        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={() => setGenerated(null)} disabled={saving}>
            やり直す
          </button>
          <button type="button" className="button button--primary" onClick={() => save(generated)} disabled={saving}>
            {saving ? '登録中…' : '登録する'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="単語を追加" back="/" />
      <form className="card add-form" onSubmit={handleGenerate}>
        <label className="field" htmlFor="headword">
          <span className="field__label">英単語</span>
          <input
            id="headword"
            type="text"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            placeholder="例: deter"
            value={headword}
            onChange={(event) => setHeadword(event.target.value)}
          />
        </label>
        <button type="submit" className="button button--primary button--block" disabled={generating || !headword.trim()}>
          {generating ? 'AIが生成中…' : 'AIで単語情報を生成'}
        </button>
        <button type="button" className="link-button" onClick={() => setManual(true)}>
          AIを使わず手入力で登録する
        </button>
      </form>
      {generating && <p className="placeholder">発音・コアイメージ・意味・派生語・例文・使い分けを生成しています…</p>}
    </>
  );
}
