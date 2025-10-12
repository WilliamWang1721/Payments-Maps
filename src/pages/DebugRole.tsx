import PageTransition from '@/components/PageTransition'

const DebugRole = () => (
  <PageTransition variant="fadeIn">
    <div className="p-4">
      <h1 className="text-xl font-semibold">Debug Role Page</h1>
      <p className="mt-2 text-gray-600">
        This placeholder page exists so that role-based routing debug tools can be implemented
        without breaking production builds.
      </p>
    </div>
  </PageTransition>
)

export default DebugRole
