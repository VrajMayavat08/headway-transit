import { Bell, CircleDot, GitBranch, History, Network, Activity } from 'lucide-react'

export const navigation = [
  { to: '/network', label: 'Network', icon: Network },
  { to: '/routes', label: 'Routes', icon: GitBranch },
  { to: '/stops', label: 'Stops', icon: CircleDot },
  { to: '/reliability', label: 'Reliability', icon: Activity },
  { to: '/playback', label: 'Playback', icon: History },
  { to: '/alerts', label: 'Alerts', icon: Bell },
] as const
