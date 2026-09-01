'use client';

import { UsersTable } from '@/components/admin/users-table';

export default function HelpersPage() {
  return <UsersTable role="HELPER" titleKey="admin.helpersTitle" />;
}
