'use client';

import { UsersTable } from '@/components/admin/users-table';

export default function SupervisorsPage() {
  return <UsersTable role="SUPERVISOR" titleKey="admin.supervisorsTitle" />;
}
