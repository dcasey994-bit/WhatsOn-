import './ErrorBanner.css'

// Inline error strip with an optional retry action. Use wherever a data
// fetch failing would otherwise leave the user staring at an empty screen.
export default function ErrorBanner({ message = "Couldn't load. Check your connection.", onRetry }) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner-msg">⚠ {message}</span>
      {onRetry && (
        <button className="error-banner-retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
