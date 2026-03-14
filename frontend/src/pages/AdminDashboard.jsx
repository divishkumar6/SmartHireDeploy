import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Users, Trophy, Activity, Plus, ArrowRight, RefreshCw, Shield, UserCog } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import SkillHeatmap from '../components/ui/SkillHeatmap';

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>
      {label && <p style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
            <span style={{ color: 'var(--text2)' }}>{p.name}</span>
          </div>
          <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const PTT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: p.payload.fill }} />
        <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{p.name}</span>
      </div>
      <p style={{ color: p.payload.fill, fontWeight: 700, fontSize: 18 }}>{p.value}</p>
      <p style={{ color: 'var(--text3)', fontSize: 11 }}>{p.payload.pct}% of total</p>
    </div>
  );
};

const COLORS = ['#6272f1','#22d3ee','#f59e0b','#10b981','#ef4444','#a855f7'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [drives, setDrives] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updated, setUpdated] = useState(new Date());

  const load = useCallback(async (silent = false) => {
    silent ? setSyncing(true) : setLoading(true);
    try {
      const statsRes = await api.get('/candidates/dashboard-stats');
      setStats(statsRes.data.stats);
    } catch (e) { console.error('Stats error:', e?.response?.data || e.message); }
    try {
      const drivesRes = await api.get('/drives?limit=6');
      setDrives(drivesRes.data.drives || []);
    } catch (e) { console.error('Drives error:', e?.response?.data || e.message); }
    try {
      const heatmapRes = await api.get('/candidates/heatmap');
      setHeatmap(heatmapRes.data.heatmap || []);
    } catch (e) { console.error('Heatmap error:', e?.response?.data || e.message); }
    try {
      const analyticsRes = await api.get('/admin/analytics');
      setMonthly(analyticsRes.data.monthlyData || []);
    } catch (e) { console.error('Analytics error:', e?.response?.data || e.message); }
    setUpdated(new Date());
    setLoading(false); setSyncing(false);
  }, []);

  useEffect(() => { load(); const iv = setInterval(() => load(true), 15000); return () => clearInterval(iv); }, [load]);

  const s = stats || {};
  const total = s.totalCandidates || 0;
  const pie = (s.statusBreakdown || []).map((x, i) => ({
    name: x._id?.replace('_',' ') || 'unknown', value: x.count, fill: COLORS[i % COLORS.length],
    pct: total ? Math.round((x.count / total) * 100) : 0,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--gold)' }}>👑 Admin</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Live · {updated.toLocaleTimeString()}</span>
          </div>
          <h1 className="title">Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span></h1>
          <p className="subtitle">System overview — all recruiters &amp; drives</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(true)} disabled={syncing}
            className="btn btn-secondary" style={{ fontSize: 12 }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <Link to="/drives/new" className="btn btn-primary"><Plus size={14} /> New Drive</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Total Drives"     value={s.totalDrives   ?? '—'} color="#6272f1" delay={0}    />
        <StatCard icon={Activity}  label="Active Drives"   value={s.activeDrives  ?? '—'} color="#22d3ee" delay={0.06} />
        <StatCard icon={Users}     label="All Candidates"  value={s.totalCandidates ?? '—'} color="#f59e0b" delay={0.12} />
        <StatCard icon={Trophy}    label="Selected"        value={s.selectedCount ?? '—'} color="#10b981" delay={0.18} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.24 }}
          className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title">Recruitment Trend</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Live from DB · last 6 months</p>
            </div>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display:'inline-block', animation:'pulse 2s infinite' }} />
              Live
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6272f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6272f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="candidates" stroke="#6272f1" fill="url(#gC)" strokeWidth={2} name="Candidates" />
              <Area type="monotone" dataKey="selected"   stroke="#10b981" fill="url(#gS)" strokeWidth={2} name="Selected" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} className="card p-5">
          <p className="section-title mb-1">Status Breakdown</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>All candidates</p>
          {pie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pie} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<PTT />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {pie.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: item.fill }} />
                      <span style={{ color: 'var(--text2)', textTransform: 'capitalize' }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text3)', fontSize: 11 }}>{item.pct}%</span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:160,color:'var(--text3)',fontSize:13 }}>No data yet</div>}
        </motion.div>
      </div>

      {/* Drives per month */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.36 }} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title">Drives Created per Month</p>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Real-time · last 6 months</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={monthly} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<TT />} cursor={{ fill: 'rgba(99,114,241,0.05)' }} />
            <Bar dataKey="drives" name="Drives" fill="#6272f1" radius={[5,5,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Admin shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to:'/admin/users', icon:UserCog, label:'User Management', desc:'Manage accounts, roles & access', color:'#f59e0b' },
          { to:'/ats-checker', icon:Shield,  label:'ATS Checker',      desc:'Analyze resumes instantly',      color:'#6272f1' },
          { to:'/rankings',    icon:Trophy,  label:'Rankings',         desc:'View global candidate rankings', color:'#22d3ee' },
        ].map(({ to, icon: Icon, label, desc, color }) => (
          <Link key={to} to={to} className="card p-4 flex items-start gap-3 block"
            style={{ textDecoration: 'none', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color + '40'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)' }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <SkillHeatmap data={heatmap} loading={loading} />

      {/* All Drives */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="section-title">All Drives</p>
          <Link to="/drives" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding: 32 }}>
            <div style={{ width:20,height:20,border:'2px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 1, background: 'var(--border)' }}>
            {drives.map(drive => (
              <Link key={drive._id} to={'/drives/' + drive._id}
                style={{ background: 'var(--bg2)', padding: '14px 18px', display:'flex', alignItems:'center', gap:12, textDecoration:'none', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(99,114,241,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Briefcase size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{drive.name}</p>
                  <p style={{ fontSize:11,color:'var(--text3)' }}>{drive.totalCandidates||0} candidates</p>
                </div>
                <StatusBadge status={drive.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
