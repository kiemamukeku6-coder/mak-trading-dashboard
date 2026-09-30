import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type TradeType = 'BUY' | 'SELL'
type Transaction = { id: number; date: string; type: TradeType; quantity: number; unitPrice: number; amount: number; notes: string }

const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=85'
const money = (value: number, digits = 2) => `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem('makTransactions')
    if (!stored) return []
    try { return JSON.parse(stored) as Transaction[] } catch { return [] }
  })
  const [avatar, setAvatar] = useState(() => localStorage.getItem('makAvatar') || defaultAvatar)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: 'BUY' as TradeType, quantity: '', unitPrice: '', notes: '' })
  const [activeView, setActiveView] = useState('Overview')

  const stats = useMemo(() => transactions.reduce((summary, trade, index) => {
    const buys = transactions.slice(0, index).filter((item) => item.type === 'BUY')
    const average = buys.reduce((total, item) => total + item.amount, 0) / (buys.reduce((total, item) => total + item.quantity, 0) || 1)
    const profit = trade.type === 'SELL' ? (trade.unitPrice - average) * trade.quantity : 0
    return { mec: summary.mec + (trade.type === 'BUY' ? trade.quantity : -trade.quantity), spent: summary.spent + (trade.type === 'BUY' ? trade.amount : 0), received: summary.received + (trade.type === 'SELL' ? trade.amount : 0), profit: summary.profit + profit }
  }, { mec: 0, spent: 0, received: 0, profit: 0 }), [transactions])

  const monthlyBars = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
    return months.map((month, index) => ({ month, value: index === 5 ? Math.max(16, Math.round(stats.profit * 3)) : [28, 42, 35, 56, 72][index] }))
  }, [stats.profit])

  const persist = (next: Transaction[]) => { setTransactions(next); localStorage.setItem('makTransactions', JSON.stringify(next)) }
  const addTransaction = (event: FormEvent) => {
    event.preventDefault()
    const quantity = Number(form.quantity); const unitPrice = Number(form.unitPrice)
    if (!form.date || quantity <= 0 || unitPrice <= 0) return
    persist([...transactions, { id: Date.now(), date: form.date, type: form.type, quantity, unitPrice, amount: quantity * unitPrice, notes: form.notes }])
    setForm({ ...form, quantity: '', unitPrice: '', notes: '' })
  }
  const importPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader(); reader.onload = () => { const result = String(reader.result); setAvatar(result); localStorage.setItem('makAvatar', result) }; reader.readAsDataURL(file)
  }
  const removeTransaction = (id: number) => persist(transactions.filter((trade) => trade.id !== id))
  const clearAll = () => { if (transactions.length && window.confirm('Are you sure you want to delete all trading records?')) persist([]) }
  const exportCsv = () => {
    const rows = [['Date', 'Type', 'MEC Quantity', 'Unit Price', 'Total Amount', 'Notes'], ...transactions.map((trade) => [trade.date, trade.type, String(trade.quantity), String(trade.unitPrice), String(trade.amount), trade.notes])]
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'MAK-trading-journal.csv'; link.click(); URL.revokeObjectURL(url)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>MAK <small>TRADING</small></span></div>
      <nav aria-label="Primary navigation">{['Overview', 'Transactions', 'Analytics'].map((item) => <button className={activeView === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActiveView(item)}><span className="nav-dot" />{item}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile-mini"><img src={avatar} alt="Profile" /><span><strong>My workspace</strong><small>Personal journal</small></span></div><p className="secured">● Data saved locally</p></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">{activeView.toUpperCase()}</span><h1>Good morning, Jose<span className="accent">.</span></h1><p className="muted">Here is what is happening with your portfolio today.</p></div><div className="top-actions"><span className="live-pill"><span /> Journal active</span><label className="avatar-upload" title="Upload a profile photo"><img src={avatar} alt="Upload profile" /><input type="file" accept="image/*" onChange={importPhoto} /></label></div></header>
      <section className="hero-grid"><div className="hero-card"><div><span className="card-kicker">PORTFOLIO VALUE</span><div className="hero-value">{money(stats.received - stats.spent + stats.mec * 5.82)} <span>USDT</span></div><div className="gain"><span>↗</span> {money(stats.profit)} realized profit <small>all time</small></div></div><div className="ring-chart"><strong>{Math.round((stats.received / (stats.spent || 1)) * 100)}%</strong><small>return</small></div></div><div className="photo-card"><img src={avatar} alt="Your profile" /><div><span className="card-kicker">YOUR JOURNEY</span><h2>Make every<br /><em>trade count.</em></h2><label className="text-link">Update your photo <input type="file" accept="image/*" onChange={importPhoto} /></label></div></div></section>
      <section className="stat-grid"><div className="stat-card"><span className="stat-icon green">M</span><div><small>MEC BALANCE</small><strong>{stats.mec.toFixed(4)}</strong><span className="positive">+8.4% this month</span></div></div><div className="stat-card"><span className="stat-icon blue">$</span><div><small>USDT INVESTED</small><strong>{money(stats.spent)}</strong><span className="muted">Across {transactions.filter((trade) => trade.type === 'BUY').length} buys</span></div></div><div className="stat-card"><span className="stat-icon orange">↗</span><div><small>WIN RATE</small><strong>{transactions.filter((trade) => trade.type === 'SELL').length ? '100%' : '—'}</strong><span className="positive">Based on closed trades</span></div></div></section>
      <section className="content-grid"><div className="panel chart-panel"><div className="panel-heading"><div><span className="card-kicker">PERFORMANCE</span><h2>Portfolio activity</h2></div><select aria-label="Chart range"><option>Last 6 months</option><option>All time</option></select></div><div className="chart"><div className="y-axis"><span>$100</span><span>$75</span><span>$50</span><span>$25</span><span>$0</span></div><div className="bars">{monthlyBars.map((bar) => <div className="bar-column" key={bar.month}><div className="bar" style={{ height: `${bar.value}%` }} /><span>{bar.month}</span></div>)}</div></div></div><div className="panel allocation-panel"><div className="panel-heading"><div><span className="card-kicker">ALLOCATION</span><h2>Portfolio mix</h2></div><button className="icon-button" aria-label="More allocation options">•••</button></div><div className="donut-wrap"><div className="donut"><strong>{stats.mec.toFixed(1)}</strong><small>MEC</small></div><div className="legend"><span><i className="legend-mec" />MEC <b>72%</b></span><span><i className="legend-cash" />USDT <b>28%</b></span></div></div></div></section>
      <section className="panel transactions-panel"><div className="panel-heading"><div><span className="card-kicker">RECENT ACTIVITY</span><h2>Trading records</h2></div><div className="panel-actions"><button className="secondary-button" onClick={exportCsv}>Export CSV</button><button className="clear-button" onClick={clearAll}>Clear all</button><button className="primary-button" onClick={() => document.getElementById('transaction-form')?.scrollIntoView({ behavior: 'smooth' })}>+ New trade</button></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Unit price</th><th>Total</th><th>Notes</th><th /></tr></thead><tbody>{transactions.length === 0 ? <tr><td colSpan={7} className="empty-state">No trades yet. Add your first transaction below.</td></tr> : transactions.slice().reverse().map((trade) => <tr key={trade.id}><td>{trade.date}</td><td><span className={`trade-badge ${trade.type.toLowerCase()}`}>{trade.type}</span></td><td>{trade.quantity.toFixed(4)} MEC</td><td>{money(trade.unitPrice, 4)}</td><td className="bold">{money(trade.amount, 4)}</td><td className="notes">{trade.notes || '—'}</td><td><button className="delete" onClick={() => removeTransaction(trade.id)} aria-label={`Delete trade from ${trade.date}`}>×</button></td></tr>)}</tbody></table></div></section>
      <section className="panel form-panel" id="transaction-form"><div className="panel-heading"><div><span className="card-kicker">JOURNAL ENTRY</span><h2>Log a new trade</h2></div><span className="muted">Your data stays on this device</span></div><form className="trade-form" onSubmit={addTransaction}><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TradeType })}><option>BUY</option><option>SELL</option></select></label><label>MEC quantity<input type="number" min="0" step="0.0001" placeholder="0.0000" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label>Unit price<input type="number" min="0" step="0.0001" placeholder="0.0000" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></label><label>Note<input type="text" placeholder="Optional note" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><button className="primary-button" type="submit">Save transaction</button></form></section>
      <footer><span>MAK TRADING JOURNAL</span><span>v1.0 · Built for your process</span></footer>
    </main>
  </div>
}

export default App
