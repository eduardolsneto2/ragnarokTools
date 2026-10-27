import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BellRing,
  ChevronDown,
  Clock3,
  Code2,
  Eye,
  EyeOff,
  MapPin,
  Menu,
  RotateCcw,
  Search,
  Shield,
  Skull,
  Swords,
  TimerReset,
  Trash2,
  X,
} from 'lucide-react'
import './App.css'
import mvpData from './data/mvp-data.json'
import type { Mvp, MvpTimer, TimerStatus } from './types'
import { useHiddenMvps } from './useHiddenMvps'
import { useTimers } from './useTimers'

const mvps = mvpData as Mvp[]

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatRespawn(milliseconds: number) {
  const minutes = Math.round(milliseconds / 60000)
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes}m`
}

function toLocalInput(timestamp = Date.now()) {
  const date = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000)
  return date.toISOString().slice(0, 16)
}

function getStatus(timer: MvpTimer, now: number): TimerStatus {
  if (now < timer.respawnAt) return 'waiting'
  if (now <= timer.windowClosesAt) return 'window'
  return 'overdue'
}

function MonsterImage({ mvp }: { mvp: Mvp }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="monster-fallback" aria-hidden="true">
        <Skull size={30} />
      </div>
    )
  }
  return (
    <img
      className="monster-image"
      src={mvp.imageUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function ActiveTimer({
  timer,
  mvp,
  now,
  onRemove,
  onReset,
}: {
  timer: MvpTimer
  mvp: Mvp
  now: number
  onRemove: () => void
  onReset: () => void
}) {
  const spawn = mvp.spawns.find((item) => item.mapname === timer.mapname)!
  const status = getStatus(timer, now)
  const countdown =
    status === 'waiting'
      ? formatDuration(timer.respawnAt - now)
      : status === 'window'
        ? formatDuration(timer.windowClosesAt - now)
        : '00:00:00'
  const label =
    status === 'waiting'
      ? 'Window opens in'
      : status === 'window'
        ? 'Spawn window active'
        : 'Spawn window passed'

  return (
    <article className={`timer-card timer-${status}`}>
      <div className="timer-monster">
        <MonsterImage mvp={mvp} />
        <div>
          <span className={`status-pill status-${status}`}>
            <span className="status-dot" />
            {status === 'waiting' ? 'Waiting' : status === 'window' ? 'Live' : 'Overdue'}
          </span>
          <h3>{mvp.name}</h3>
          <p><MapPin size={13} /> {spawn.mapDisplayName}</p>
        </div>
      </div>
      <div className="countdown">
        <span>{label}</span>
        <strong>{countdown}</strong>
      </div>
      <div className="timer-actions">
        <button className="icon-button" onClick={onReset} title="Reset kill time">
          <RotateCcw size={17} />
        </button>
        <button className="icon-button danger" onClick={onRemove} title="Remove timer">
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  )
}

function StartTimerDialog({
  mvp,
  onClose,
  onStart,
}: {
  mvp: Mvp
  onClose: () => void
  onStart: (mapname: string, killedAt: number) => void
}) {
  const [mapname, setMapname] = useState(mvp.spawns[0].mapname)
  const [killedAt, setKilledAt] = useState(toLocalInput())
  const spawn = mvp.spawns.find((item) => item.mapname === mapname)!

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onStart(mapname, new Date(killedAt).getTime())
    onClose()
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timer-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <div className="dialog-heading">
          <MonsterImage mvp={mvp} />
          <div>
            <span>Log a kill</span>
            <h2 id="timer-dialog-title">{mvp.name}</h2>
          </div>
        </div>
        <form onSubmit={submit}>
          <label>
            Spawn location
            <span className="select-wrap">
              <select value={mapname} onChange={(event) => setMapname(event.target.value)}>
                {mvp.spawns.map((item) => (
                  <option key={item.mapname} value={item.mapname}>
                    {item.mapDisplayName} · {item.mapname}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
          <label>
            Time of death
            <input
              type="datetime-local"
              required
              value={killedAt}
              max={toLocalInput()}
              onChange={(event) => setKilledAt(event.target.value)}
            />
          </label>
          <div className="spawn-summary">
            <Clock3 size={18} />
            <div>
              <strong>Respawn window</strong>
              <span>
                {formatRespawn(spawn.respawnTime)}
                {spawn.respawnVariance > 0
                  ? ` – ${formatRespawn(spawn.respawnTime + spawn.respawnVariance)}`
                  : ''}
                {' '}after the kill
              </span>
            </div>
          </div>
          <button className="primary-button full-button" type="submit">
            <TimerReset size={18} /> Start tracking
          </button>
        </form>
      </section>
    </div>
  )
}

function App() {
  const [search, setSearch] = useState('')
  const [element, setElement] = useState('All elements')
  const [selectedMvp, setSelectedMvp] = useState<Mvp | null>(null)
  const [now, setNow] = useState(Date.now())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const { timers, startTimer, removeTimer, clearTimers } = useTimers()
  const { hiddenIds, hideMvp, restoreMvp, restoreAll } = useHiddenMvps()
  const notified = useRef(new Set<string>())
  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (Notification.permission !== 'granted') return
    timers.forEach((timer) => {
      if (
        getStatus(timer, now) === 'window' &&
        !notified.current.has(timer.id)
      ) {
        const mvp = mvps.find((item) => item.id === timer.mvpId)
        if (mvp) {
          new Notification(`${mvp.name} may have spawned`, {
            body: 'The respawn window is now open.',
          })
          notified.current.add(timer.id)
        }
      }
    })
  }, [now, timers])

  const matchesFilters = (mvp: Mvp) => {
    const query = search.trim().toLowerCase()
    const matchesElement =
      element === 'All elements' || mvp.element.startsWith(element)
    const matchesQuery =
      !query ||
      mvp.name.toLowerCase().includes(query) ||
      mvp.spawns.some(
        (spawn) =>
          spawn.mapname.toLowerCase().includes(query) ||
          spawn.mapDisplayName.toLowerCase().includes(query),
      )
    return matchesElement && matchesQuery
  }

  const filteredMvps = useMemo(
    () => mvps.filter((mvp) => !hiddenSet.has(mvp.id) && matchesFilters(mvp)),
    [element, hiddenSet, search],
  )

  const hiddenMvps = useMemo(
    () =>
      mvps
        .filter((mvp) => hiddenSet.has(mvp.id) && matchesFilters(mvp))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [element, hiddenSet, search],
  )

  const activeTimers = useMemo(
    () =>
      [...timers].sort((a, b) => {
        const aTarget = now < a.respawnAt ? a.respawnAt : a.windowClosesAt
        const bTarget = now < b.respawnAt ? b.respawnAt : b.windowClosesAt
        return aTarget - bTarget
      }),
    [now, timers],
  )

  const requestNotifications = async () => {
    if ('Notification' in window) await Notification.requestPermission()
  }

  const handleHide = (mvpId: number) => {
    hideMvp(mvpId)
    timers
      .filter((timer) => timer.mvpId === mvpId)
      .forEach((timer) => removeTimer(timer.id))
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Ragnarok Tools home">
          <span className="brand-mark"><Swords size={21} /></span>
          <span>ragnarok<span>Tools</span></span>
        </a>
        <button
          className="mobile-menu"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label="Toggle menu"
        >
          <Menu size={21} />
        </button>
        <nav className={mobileOpen ? 'nav-open' : ''}>
          <a className="nav-active" href="#tracker">MVP Timer</a>
          <span>More tools soon</span>
          <a
            className="github-link"
            href="https://github.com/eduardolsneto2/ragnarokTools"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={17} /> GitHub
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><Shield size={14} /> Built for every hunt</div>
            <h1>Never miss an <span>MVP</span> again.</h1>
            <p>
              Track kill times, watch live respawn windows, and keep every hunt
              organized in one place.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#tracker">
                <Clock3 size={18} /> Open timer
              </a>
              <button className="secondary-button" onClick={requestNotifications}>
                <Bell size={18} /> Enable alerts
              </button>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="rune rune-one" />
            <div className="rune rune-two" />
            <div className="hero-clock"><Skull size={42} /></div>
            <div className="orbit orbit-one"><span /></div>
            <div className="orbit orbit-two"><span /></div>
          </div>
        </section>

        <section className="tracker-section" id="tracker">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Your hunt board</span>
              <h2>Active timers</h2>
              <p>Saved on this device. Your timers remain after you close the page.</p>
            </div>
            {timers.length > 0 && (
              <button className="text-button" onClick={clearTimers}>
                <Trash2 size={15} /> Clear all
              </button>
            )}
          </div>

          {activeTimers.length ? (
            <div className="timer-list">
              {activeTimers.map((timer) => {
                const mvp = mvps.find((item) => item.id === timer.mvpId)
                if (!mvp) return null
                return (
                  <ActiveTimer
                    key={timer.id}
                    timer={timer}
                    mvp={mvp}
                    now={now}
                    onRemove={() => removeTimer(timer.id)}
                    onReset={() => startTimer(mvp, timer.mapname, Date.now())}
                  />
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div><BellRing size={25} /></div>
              <h3>No active timers yet</h3>
              <p>Choose an MVP below and log its kill to start tracking.</p>
            </div>
          )}
        </section>

        <section className="catalog-section">
          <div className="section-heading catalog-heading">
            <div>
              <span className="section-kicker">MVP database</span>
              <h2>Choose your target</h2>
            </div>
            <div className="catalog-meta">
              <span className="result-count">{filteredMvps.length} visible</span>
              {hiddenIds.length > 0 && (
                <span className="result-count muted-count">{hiddenIds.length} hidden</span>
              )}
            </div>
          </div>
          <div className="filters">
            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search MVP or map..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="select-wrap filter-select">
              <select value={element} onChange={(event) => setElement(event.target.value)}>
                {['All elements', 'Neutral', 'Water', 'Earth', 'Fire', 'Wind', 'Poison', 'Holy', 'Shadow', 'Ghost', 'Undead', 'Dark'].map(
                  (item) => <option key={item}>{item}</option>,
                )}
              </select>
              <ChevronDown size={16} />
            </label>
          </div>

          <div className="mvp-grid">
            {filteredMvps.map((mvp) => {
              const spawn = mvp.spawns[0]
              const hasTimer = timers.some((timer) => timer.mvpId === mvp.id)
              return (
                <article className="mvp-card" key={mvp.id}>
                  <div className="card-top">
                    <MonsterImage mvp={mvp} />
                    <span className="level-badge">Lv. {mvp.level}</span>
                    {hasTimer && <span className="tracking-badge">Tracking</span>}
                    <button
                      className="hide-button"
                      title="Hide from your pool"
                      onClick={() => handleHide(mvp.id)}
                    >
                      <EyeOff size={14} />
                    </button>
                  </div>
                  <div className="card-body">
                    <h3>{mvp.name}</h3>
                    <div className="monster-meta">
                      <span>{mvp.element}</span>
                      <span>{mvp.race}</span>
                      <span>{mvp.health.toLocaleString()} HP</span>
                    </div>
                    <div className="spawn-info">
                      <MapPin size={15} />
                      <div>
                        <strong>{spawn.mapDisplayName}</strong>
                        <span>
                          {mvp.spawns.length > 1
                            ? `+${mvp.spawns.length - 1} more · `
                            : ''}
                          {formatRespawn(spawn.respawnTime)}
                          {spawn.respawnVariance
                            ? `–${formatRespawn(spawn.respawnTime + spawn.respawnVariance)}`
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="track-button" onClick={() => setSelectedMvp(mvp)}>
                        <Skull size={17} /> Log kill
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          {!filteredMvps.length && (
            <div className="no-results">
              <Search size={26} />
              <h3>No MVPs found</h3>
              <p>
                {hiddenIds.length
                  ? 'Try another search, or restore MVPs from your hidden pool.'
                  : 'Try another name, map, or element.'}
              </p>
            </div>
          )}

          {hiddenIds.length > 0 && (
            <div className="hidden-pool">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Your pool</span>
                  <h2>Hidden MVPs</h2>
                  <p>Removed from this device only. Restore any time.</p>
                </div>
                <div className="hidden-actions">
                  <button
                    className="text-button"
                    onClick={() => setShowHidden((current) => !current)}
                  >
                    {showHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    {showHidden ? 'Collapse' : `Show ${hiddenIds.length}`}
                  </button>
                  <button className="text-button" onClick={restoreAll}>
                    <RotateCcw size={15} /> Restore all
                  </button>
                </div>
              </div>
              {showHidden && (
                <div className="hidden-list">
                  {hiddenMvps.map((mvp) => (
                    <div className="hidden-row" key={mvp.id}>
                      <MonsterImage mvp={mvp} />
                      <div>
                        <strong>{mvp.name}</strong>
                        <span>Lv. {mvp.level} · {mvp.spawns[0]?.mapDisplayName}</span>
                      </div>
                      <button
                        className="secondary-button restore-button"
                        onClick={() => restoreMvp(mvp.id)}
                      >
                        <Eye size={15} /> Restore
                      </button>
                    </div>
                  ))}
                  {!hiddenMvps.length && (
                    <p className="hidden-empty">No hidden MVPs match your current filters.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark"><Swords size={18} /></span>
          <span>ragnarok<span>Tools</span></span>
        </div>
        <p>Game data sourced from <a href="https://www.divine-pride.net/" target="_blank" rel="noreferrer">Divine Pride</a>. Timings may vary by server.</p>
      </footer>

      {selectedMvp && (
        <StartTimerDialog
          mvp={selectedMvp}
          onClose={() => setSelectedMvp(null)}
          onStart={(mapname, killedAt) => startTimer(selectedMvp, mapname, killedAt)}
        />
      )}
    </div>
  )
}

export default App
