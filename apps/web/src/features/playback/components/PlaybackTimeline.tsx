import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

type PlaybackTimelineProps = { speed: string; onSpeedChange: (speed: string) => void }

export function PlaybackTimeline({ speed, onSpeedChange }: PlaybackTimelineProps) {
  return (
    <section className="playback-timeline" aria-label="Historical playback timeline">
      <div className="playback-timeline-controls">
        <button type="button" disabled aria-label="Previous event"><SkipBack size={15} /></button>
        <button type="button" disabled aria-label="Play historical session"><Play size={16} /></button>
        <button type="button" disabled aria-label="Pause historical session"><Pause size={15} /></button>
        <button type="button" disabled aria-label="Next event"><SkipForward size={15} /></button>
      </div>
      <span className="playback-time-label">00:00</span>
      <div className="playback-timeline-track" aria-label="No recorded session timeline"><i /></div>
      <span className="playback-time-label">24:00</span>
      <label className="playback-speed"><span>SPEED</span><select value={speed} onChange={(event) => onSpeedChange(event.target.value)}><option>1×</option><option>2×</option><option>4×</option></select></label>
      <span className="playback-unavailable">NO RECORDED SESSION</span>
    </section>
  )
}
