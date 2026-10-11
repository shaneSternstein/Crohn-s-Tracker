import { Link } from 'react-router-dom';
import { Icon } from './icons';

/** The one way into Settings. Shown at the top right of the three main tabs. */
export default function SettingsLink() {
  return (
    <Link to="/settings" className="gear" aria-label="Settings">
      <Icon name="gear" />
    </Link>
  );
}
