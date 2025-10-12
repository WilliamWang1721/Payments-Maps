import PageTransition from '@/components/PageTransition'

const GoogleTest = () => (
  <PageTransition variant="fadeIn">
    <div className="p-4">
      <h1 className="text-xl font-semibold">Google Test Page</h1>
      <p className="mt-2 text-gray-600">
        This placeholder page allows the application to build successfully while the Google
        integration tests are implemented.
      </p>
    </div>
  </PageTransition>
)

export default GoogleTest
