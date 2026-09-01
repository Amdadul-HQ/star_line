'use client';

import { UsersTable } from '@/components/admin/users-table';

export default function PassengersPage() {
  return <UsersTable role="PASSENGER" titleKey="admin.passengersTitle" />;
}
