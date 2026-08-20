import { navigate } from '../App.jsx';

export default function Header({ title, back = null, actions = null }) {
  return (
    <header className="header">
      {back ? (
        <button type="button" className="header__back" onClick={() => navigate(back)}>
          ←
        </button>
      ) : (
        <span className="header__logo" aria-hidden="true">
          W
        </span>
      )}
      <h1 className="header__title">{title}</h1>
      <div className="header__actions">{actions}</div>
    </header>
  );
}
