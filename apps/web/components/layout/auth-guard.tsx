'use client';

import { ROLE_HOME_PATH, type RoleName } from '@starline/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/feedback';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Client-side route guard — UX only (redirects). The API enforces the real
 * authorization on every request; hiding a page here is never relied upon
 * for security.
 */
export function AuthGuard({
  roles,
  children,
}: {
  roles?: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  const allowed = !!user && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/login');
    } else if (!allowed) {
      router.replace(ROLE_HOME_PATH[user.role as RoleName] ?? '/');
    }
  }, [hydrated, user, allowed, router]);

  if (!hydrated || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    );
  }
  return <>{children}</>;
}
