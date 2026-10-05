import { useState } from 'react';
import type { Credentials } from './api/types';
import { LoginScreen } from './components/LoginScreen';
import { Messenger } from './components/Messenger';
import { loadCredentials, saveChats, saveCredentials } from './lib/storage';

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials);

  if (!credentials) {
    return (
      <LoginScreen
        onLogin={(c) => {
          saveCredentials(c);
          setCredentials(c);
        }}
      />
    );
  }

  return (
    <Messenger
      // При смене инстанса состояние чатов должно начаться с нуля
      key={credentials.idInstance}
      credentials={credentials}
      onLogout={() => {
        saveCredentials(null);
        saveChats(credentials.idInstance, null);
        setCredentials(null);
      }}
    />
  );
}
