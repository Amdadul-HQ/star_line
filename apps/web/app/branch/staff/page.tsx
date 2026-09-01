'use client';

import { UsersTable } from '@/components/admin/users-table';

export default function BranchStaffPage() {
  return <UsersTable role="TICKETER" titleKey="admin.ticketersTitle" />;
}
