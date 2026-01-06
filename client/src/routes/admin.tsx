import { useEffect, useState, type FormEvent } from 'react';
import { Button, Callout, Card, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { Navigation } from '../components/Navigation';
import { apiPath } from '../config';
import { fetchJson } from '../lib/api';

const STORAGE_KEY = 'cardstone_admin_token';

interface LoginResponse {
  token: string;
  expiresAt: string;
}

interface ProfileResponse {
  username: string;
  expiresAt: string;
}

export function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      void refreshSession(storedToken);
    }
  }, []);

  async function refreshSession(currentToken: string): Promise<void> {
    setLoading(true);
    try {
      const profile = await fetchJson<ProfileResponse>(apiPath('/api/admin/me'), {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setToken(currentToken);
      setExpiresAt(profile.expiresAt);
      setProfileName(profile.username);
      localStorage.setItem(STORAGE_KEY, currentToken);
      setError(null);
    } catch (err) {
      console.error('Failed to validate admin token', err);
      setError('Session expired. Please sign in again.');
      setToken(null);
      setExpiresAt(null);
      setProfileName(null);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetchJson<LoginResponse>(apiPath('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      await refreshSession(response.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout(): void {
    setToken(null);
    setExpiresAt(null);
    setProfileName(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const authenticated = Boolean(token && expiresAt && profileName);

  return (
    <div className="h-full">
      <Navigation />
      <div className="flex justify-center items-start w-full h-[calc(100%-98px)] bg-slate-950">
        <div className="mt-10 w-full max-w-2xl px-6">
          <Card size="4">
            <Flex direction="column" gap="4">
              <div>
                <Heading size="6" mb="2">
                  Admin access
                </Heading>
                <Text as="p" color="gray">
                  Sign in with the credentials configured on the server (ADMIN_USERNAME / ADMIN_PASSWORD). A short-lived token
                  will be issued on success.
                </Text>
              </div>

              {error && (
                <Callout.Root color="red">
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              {authenticated ? (
                <Flex direction="column" gap="3">
                  <Text>Signed in as {profileName}</Text>
                  <Text color="gray">Token expires at: {expiresAt}</Text>
                  <Text color="gray">Bearer token:</Text>
                  <TextField.Root value={token ?? ''} readOnly />
                  <Flex gap="2">
                    <Button onClick={() => token && refreshSession(token)} disabled={loading} variant="surface">
                      Refresh session
                    </Button>
                    <Button onClick={handleLogout} color="red" variant="solid">
                      Sign out
                    </Button>
                  </Flex>
                </Flex>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Text as="label" className="block mb-1">
                      Username
                    </Text>
                    <TextField.Root
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Enter admin username"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Text as="label" className="block mb-1">
                      Password
                    </Text>
                    <TextField.Root
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter admin password"
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              )}
            </Flex>
          </Card>
        </div>
      </div>
    </div>
  );
}
