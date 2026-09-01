'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GeneralSettingsInput } from '@starline/shared';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingBlock } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';

export default function SettingsPage() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GeneralSettingsInput | null>(null);

  const settings = useQuery({
    queryKey: ['settings-general'],
    queryFn: () => api<GeneralSettingsInput>('/settings/general'),
  });

  useEffect(() => {
    if (settings.data && !form) setForm(settings.data);
  }, [settings.data, form]);

  const save = useMutation({
    mutationFn: () => api<GeneralSettingsInput>('/settings/general', { method: 'PUT', body: form }),
    onSuccess: () => {
      toast.push(t('admin.settingsSaved'));
      void queryClient.invalidateQueries({ queryKey: ['settings-general'] });
    },
    onError: (err) =>
      toast.push(err instanceof ApiError ? t(`errors.${err.code}`) : t('errors.NETWORK'), 'error'),
  });

  return (
    <div>
      <PageHeader title={t('admin.settingsTitle')} />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('admin.settingsGeneral')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!form ? (
            <LoadingBlock rows={4} />
          ) : (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <Field label={t('admin.companyName')} className="sm:col-span-2">
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </Field>
              <Field label={t('admin.supportPhone')}>
                <Input
                  value={form.supportPhone}
                  onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                />
              </Field>
              <Field label={t('admin.supportEmail')}>
                <Input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                />
              </Field>
              <Field label={t('admin.defaultLocale')}>
                <Select
                  value={form.defaultLocale}
                  onChange={(e) => setForm({ ...form, defaultLocale: e.target.value as 'en' | 'bn' })}
                >
                  <option value="en">English</option>
                  <option value="bn">বাংলা</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" loading={save.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
