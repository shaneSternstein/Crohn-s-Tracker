import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Log' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/insights', label: 'Insights' },
];

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tab">{t.label}</NavLink>
      ))}
    </nav>
  );
}
