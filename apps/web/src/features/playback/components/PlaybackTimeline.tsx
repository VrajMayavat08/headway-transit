import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import styles from './PlaybackTimeline.module.css'
import { formatLocalDateTime, formatLocalTime } from '@/lib/formatting/time'

type PlaybackTimelineProps = {
  timeline: string[]
  requestedAt: string
  actualAt: string | null
  onSeek: (timestamp: string) => void
  loading: boolean
}

export function PlaybackTimeline({ timeline, requestedAt, actualAt, onSeek, loading }: PlaybackTimelineProps) {
  const start = timeline[0]
  const end = timeline[timeline.length - 1]
  const reference = actualAt ?? requestedAt
  const previous = timeline.filter((time) => time < reference).at(-1)
  const next = timeline.find((time) => time > reference)
  return <section className="playback-timeline" aria-label="Historical playback timeline">
    <div className="playback-timeline-controls">
      <button type="button" disabled={!previous} onClick={() => previous && onSeek(previous)} aria-label="Previous collected snapshot"><SkipBack size={15} /></button>
      <button type="button" disabled aria-label="Automatic playback unavailable; step through collected snapshots"><Play size={16} /></button>
      <button type="button" disabled aria-label="Automatic playback unavailable"><Pause size={15} /></button>
      <button type="button" disabled={!next} onClick={() => next && onSeek(next)} aria-label="Next collected snapshot"><SkipForward size={15} /></button>
    </div>
    <span className="playback-time-label">{formatLocalTime(start)}</span>
    <input className={styles.scrubber} type="range" aria-label="Requested historical time" aria-valuetext={formatLocalDateTime(requestedAt)}
      disabled={!start || start === end} min={start ? Date.parse(start) : 0} max={end ? Date.parse(end) : 1} step="1"
      value={start ? Math.max(Date.parse(start), Math.min(Date.parse(end), Date.parse(requestedAt))) : 0}
      onChange={(event) => onSeek(new Date(Number(event.target.value)).toISOString())} />
    <span className="playback-time-label">{formatLocalTime(end)}</span>
    <label className="playback-speed"><span>SPEED</span><select disabled aria-label="Manual snapshot review"><option>Manual</option></select></label>
    <span className="playback-unavailable" role="status">{loading ? 'LOADING SNAPSHOT' : actualAt ? formatLocalTime(actualAt) : 'NO SNAPSHOT'}</span>
  </section>
}
