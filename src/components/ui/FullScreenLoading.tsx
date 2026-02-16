interface FullScreenLoadingProps {
  message: string
  title?: string
  backgroundClassName?: string
}

const FullScreenLoading = ({
  message,
  title,
  backgroundClassName = 'bg-gray-50',
}: FullScreenLoadingProps) => {
  return (
    <div className={`min-h-screen flex items-center justify-center ${backgroundClassName}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        {title ? <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2> : null}
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

export default FullScreenLoading
