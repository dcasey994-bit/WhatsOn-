import { getSubscriptionState, trialDaysLeft, venueNeedsAttention } from '../data/eventsStore.js'
import './VenueAttention.css'

// The consequence, not the state. The subscription card directly below already
// says "Venue archived" and the header says which venue — repeating either just
// gives you two boxes saying the same thing. What neither says is what it costs
// them, which is the part that makes someone act.
function message(venue) {
  if (getSubscriptionState(venue) === 'archived') {
    return 'Customers can no longer see this venue or any of its events. Reactivating puts them straight back on the map.'
  }
  const days = trialDaysLeft(venue)
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  return `Your free trial ends ${when}. After that this venue and its events stop appearing to customers until you subscribe.`
}

// Only ever rendered when there is something the admin can do about it, so it
// never becomes wallpaper — see venueNeedsAttention.
//
// Amber while a trial is running out, red once events are actually off the map:
// the second is a thing that has already gone wrong, not one that is coming.
export default function VenueAttention({ venue }) {
  if (!venueNeedsAttention(venue)) return null
  const urgent = getSubscriptionState(venue) === 'archived'

  return (
    <div className={`va-banner ${urgent ? 'va-banner-urgent' : ''}`} role="status">
      {message(venue)}
    </div>
  )
}
