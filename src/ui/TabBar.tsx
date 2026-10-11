import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './icons';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Log', icon: 'tabLog' },
  { to: '/timeline', label: 'Timeline', icon: 'tabTimeline' },
  { to: '/insights', label: 'Insights', icon: 'tabInsights' },
];

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tab">
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
