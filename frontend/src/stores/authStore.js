import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('lgu_token') || null,
  user: JSON.parse(localStorage.getItem('lgu_user') || 'null'),

  setSession: (session) => {
    localStorage.setItem('lgu_token', session.token);
    localStorage.setItem('lgu_user', JSON.stringify(session.user));
    set({ token: session.token, user: session.user });
  },

  logout: () => {
    localStorage.removeItem('lgu_token');
    localStorage.removeItem('lgu_user');
    set({ token: null, user: null });
  },
}));

export function useCan(...roles) {
  const user = useAuthStore((s) => s.user);
  return user && roles.includes(user.role);
}

export default useAuthStore;