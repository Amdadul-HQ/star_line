'use client';

import { UsersTable } from '@/components/admin/users-table';

export default function DriversPage() {
  return <UsersTable role="DRIVER" titleKey="admin.driversTitle" />;
}
