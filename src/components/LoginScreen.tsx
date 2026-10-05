import { useState, type FormEvent } from 'react';
import { createGreenApiClient, defaultApiUrl, GreenApiError } from '../api/greenApi';
import type { Credentials, InstanceState } from '../api/types';
import { Logo } from './icons';

const STATE_HINTS: Record<Exclude<InstanceState, 'authorized'>, string> = {
  notAuthorized: 'Инстанс не авторизован: отсканируйте QR-код в личном кабинете GREEN-API приложением MAX.',
  starting: 'Инстанс запускается. Подождите пару минут и попробуйте снова.',
  blocked: 'Аккаунт MAX на этом инстансе заблокирован.',
  suspended: 'На аккаунте MAX временные ограничения: писать можно только контактам из записной книжки.',
  pendingPassword: 'Авторизация не завершена: нужен облачный пароль MAX.',
};

interface Props {
  onLogin: (credentials: Credentials) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiToken] = useState('');
  const [customApiUrl, setCustomApiUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Пока пользователь не правил адрес API руками, он выводится из idInstance
  const apiUrl = customApiUrl ?? defaultApiUrl(idInstance);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const creds: Credentials = {
      apiUrl: apiUrl.trim(),
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    };
    if (!/^\d+$/.test(creds.idInstance)) return setError('idInstance — это число из личного кабинета');
    if (!creds.apiTokenInstance) return setError('Введите apiTokenInstance');
    if (!/^https:\/\/\S+$/.test(creds.apiUrl)) return setError('Укажите адрес API, например https://3100.api.green-api.com');

    setBusy(true);
    setError('');
    try {
      const state = await createGreenApiClient(creds).getStateInstance();
      if (state === 'authorized') onLogin(creds);
      else setError(STATE_HINTS[state] ?? `Инстанс в состоянии «${state}»`);
    } catch (err) {
      setError(err instanceof GreenApiError ? err.message : 'Не удалось подключиться к GREEN-API');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login wallpaper">
      <form className="login-card" onSubmit={submit} noValidate>
        <Logo className="login-logo" />
        <h1>Вход в чат MAX</h1>
        <p className="muted">
          Данные инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <label className="field">
          <span>idInstance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="3100123456"
            autoFocus
          />
        </label>

        <label className="field">
          <span>apiTokenInstance</span>
          <input
            value={apiTokenInstance}
            onChange={(e) => setApiToken(e.target.value)}
            type="password"
            autoComplete="off"
            placeholder="•••••••••••••••••••••"
          />
        </label>

        <label className="field">
          <span>Адрес API</span>
          <input
            value={apiUrl}
            onChange={(e) => setCustomApiUrl(e.target.value)}
            autoComplete="off"
            placeholder="https://3100.api.green-api.com"
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button-primary" disabled={busy}>
          {busy ? 'Проверяю инстанс…' : 'Войти'}
        </button>
        <p className="hint">Данные хранятся только в этой вкладке и стираются при её закрытии.</p>
      </form>
    </div>
  );
}
