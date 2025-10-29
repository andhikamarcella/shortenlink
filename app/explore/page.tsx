import { requireAuth } from '@/lib/requireAuth';
import { isModerator } from '@/lib/isModerator';

import { AnalyticsClient } from './AnalyticsClient';

export default async function ExplorePage() {
  const { user } = await requireAuth();

  return (
    <AnalyticsClient
      user={{
        id: user.id,
        email: user.email ?? null,
        isModerator: isModerator(user.email),
      }}
    />
  );
}
