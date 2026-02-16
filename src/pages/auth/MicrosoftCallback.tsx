import { syncMicrosoftUserToSupabase } from '@/lib/supabase-auth'
import SupabaseProviderCallback from '@/components/auth/SupabaseProviderCallback'

const MicrosoftCallback = () => {
  return (
    <SupabaseProviderCallback
      providerName="Microsoft"
      processingMessage="正在处理Microsoft登录..."
      syncUserToSupabase={syncMicrosoftUserToSupabase}
      replaceAfterSuccess
      replaceAfterFailure
    />
  )
}

export default MicrosoftCallback
