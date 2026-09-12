/**
 * SMRITI CLIENT ROUTE GUARD & NAVIGATION ENGINE
 * Enforces Role-Based Access Control (RBAC) on protected shells and manages URL routing.
 */

const SmritiRouter = {
  /**
   * Evaluates the current page and enforces role protection
   */
  async enforceRouteGuard() {
    const path = window.location.pathname;

    // Helper to get query param
    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get('role') || 'elderly_user';

    // Wait for auth initialization if in loading state
    const auth = window.smritiAuth;
    if (!auth) return;

    auth.onAuthStateChanged((user, loading) => {
      if (loading) return; // Wait until initial session check finishes

      const isSeniorSpace = path.includes('senior-space') || path.endsWith('/senior-space.html');
      const isCaretakerStudio = path.includes('caretaker-studio') || path.endsWith('/caretaker-studio.html');
      const isAuthPage = path.includes('auth') || path.endsWith('/auth.html');

      // 1. Unauthenticated user trying to access protected shell
      if (!user && (isSeniorSpace || isCaretakerStudio)) {
        console.warn('[Router] Unauthenticated access blocked. Redirecting to auth...');
        const fallbackRole = isSeniorSpace ? 'elderly_user' : 'caretaker';
        window.location.href = `/auth?role=${fallbackRole}`;
        return;
      }

      // 2. Already authenticated user visiting /auth
      if (user && isAuthPage) {
        console.log('[Router] Already authenticated. Routing to authorized space:', user.role);
        if (user.role === 'elderly_user') {
          window.location.href = '/senior-space';
        } else if (user.role === 'caretaker') {
          window.location.href = '/caretaker-studio';
        }
        return;
      }

      // 3. Role-Based Route Mismatch (Elderly accessing Caretaker Studio)
      if (user && isCaretakerStudio && user.role !== 'caretaker') {
        console.warn(`[Router] RBAC Mismatch: Role '${user.role}' cannot access Caretaker Studio. Redirecting...`);
        window.location.replace('/senior-space');
        return;
      }

      // 4. Role-Based Route Mismatch (Caretaker accessing Senior Space)
      if (user && isSeniorSpace && user.role !== 'elderly_user') {
        console.warn(`[Router] RBAC Mismatch: Role '${user.role}' cannot access Senior Space. Redirecting...`);
        window.location.replace('/caretaker-studio');
        return;
      }
    });
  },

  navigateToRole(role) {
    if (role === 'elderly_user') {
      window.location.href = '/senior-space';
    } else if (role === 'caretaker') {
      window.location.href = '/caretaker-studio';
    } else {
      window.location.href = '/';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  SmritiRouter.enforceRouteGuard();
});

window.SmritiRouter = SmritiRouter;
