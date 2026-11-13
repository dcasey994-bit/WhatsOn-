import './Wordmark.css'

// The WhatsOn? logo: "Whats" and "?" in the brand green, "On" in the text
// colour between them. Size and weight come from wherever it is placed.
export default function Wordmark({ className = '' }) {
  return (
    <span className={`wordmark ${className}`}>
      <span className="wordmark-whats">Whats</span>
      <span className="wordmark-on">On</span>
      <span className="wordmark-q">?</span>
    </span>
  )
}
