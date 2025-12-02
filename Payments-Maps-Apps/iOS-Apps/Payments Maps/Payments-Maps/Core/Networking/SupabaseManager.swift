import Foundation
import Supabase

enum SupabaseConfig {
    // TODO: 把下面两个值换成你项目的 URL / anon key
    static let url = URL(string: "https://ytzmqzxspcuclffegazk.supabase.co")!
    static let anonKey = "sb_publishable_MluVTpoPjqMoPCwcG0ZsRQ_mNKoz-wx"
}

final class SupabaseManager {
    static let shared = SupabaseManager()

    let client: SupabaseClient

    private init() {
        client = SupabaseClient(
            supabaseURL: SupabaseConfig.url,
            supabaseKey: SupabaseConfig.anonKey
        )
    }
}
