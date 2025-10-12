import PageTransition from '@/components/PageTransition'

const SupabaseTest = () => (
  <PageTransition variant="fadeIn">
    <div className="p-4">
      <h1 className="text-xl font-semibold">Supabase Test Page</h1>
      <p className="mt-2 text-gray-600">
        This placeholder page keeps the application routes intact while Supabase integration
        tests are developed.
      </p>
    </div>
  </PageTransition>
)

export default SupabaseTest
