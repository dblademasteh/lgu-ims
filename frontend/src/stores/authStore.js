import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('lgu_token') || null,
  refreshToken: localStorage.getItem('lgu_refresh_token') || null,
  user: JSON.parse(localStorage.getItem('lgu_user') || 'null'),

  setSession: (session) => {
    localStorage.setItem('lgu_token', session.token);
    localStorage.setItem('lgu_refresh_token', session.refreshToken);
    localStorage.setItem('lgu_user', JSON.stringify(session.user));
    set({ token: session.token, refreshToken: session.refreshToken, user: session.user });
  },

  logout: () => {
    localStorage.removeItem('lgu_token');
    localStorage.removeItem('lgu_refresh_token');
    localStorage.removeItem('lgu_user');
    set({ token: null, refreshToken: null, user: null });
  },

  setUser: (user) => {
    localStorage.setItem('lgu_user', JSON.stringify(user));
    set({ user });
  },
}));

export function useCan(...roles) {
  const user = useAuthStore((s) => s.user);
  return user && roles.includes(user.role);
}

export default useAuthStore;