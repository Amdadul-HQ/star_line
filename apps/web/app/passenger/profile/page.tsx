'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useT } from '@/lib/i18n';

export default function ProfilePage() {
  const t = useT();
  const toast = useToast();
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');

  const save = useMutation({
    mutationFn: () => api<{ name: string }>('/users/me', { method: 'PATCH', body: { name } }),
    onSuccess: (data) => {
      if (user) setUser({ ...user, name: data.name });
      toast.push(t('common.save'));
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  return (
    <div>
      <PageHeader title={t('common.profile')} />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{user?.phone}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field label={t('auth.nameLabel')}>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button type="submit" loading={save.isPending}>
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
