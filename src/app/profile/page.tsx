import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth0';
import { fetchConnectedAccounts } from '@/lib/actions/profile';
import ProfileContent from '@/components/auth0/profile/profile-content';

export default async function ProfilePage() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const initialAccounts = await fetchConnectedAccounts();

  return (
    <div className="min-h-full bg-white/5">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-white/70">Manage your connected accounts</p>
        </div>

        <ProfileContent user={session.user} initialAccounts={initialAccounts} />
      </div>
    </div>
  );
}
