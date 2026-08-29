// Match formats offered by the backend (PlaySession::FORMATS). One list so
// the create wizard and the edit-session sheet never drift apart.
export const FORMAT_OPTIONS = [
  { label: 'Smart Open Play (balanced matchmaking)', value: 'smart' },
  { label: 'Traditional Queue (first in, first out)', value: 'fifo' },
  { label: 'Winners & Losers pools (winners play winners)', value: 'winners_losers' },
]
