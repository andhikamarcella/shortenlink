import { requireAuth } from '@/lib/requireAuth';
import { isModerator } from '@/lib/isModerator';

import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const { user } = await requireAuth();

  return (
    <DashboardClient
      user={{
        id: user.id,
        email: user.email ?? null,
        isModerator: isModerator(user.email),
      }}
    />
  );
}
