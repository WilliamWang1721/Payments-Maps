import { syncGitHubUserToSupabase } from '@/lib/supabase-auth'
import SupabaseProviderCallback from '@/components/auth/SupabaseProviderCallback'

export default function GitHubCallback() {
  return (
    <SupabaseProviderCallback
      providerName="GitHub"
      processingMessage="正在处理 GitHub 登录..."
      syncUserToSupabase={syncGitHubUserToSupabase}
    />
  )
}
