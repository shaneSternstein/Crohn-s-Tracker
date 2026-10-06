import { Navigate, useParams } from 'react-router-dom';
import { Screen } from '../../ui/bits';
import EventEntry from './EventEntry';
import ItemEntry from './ItemEntry';
import MedEntry from './MedEntry';
import SleepEntry from './SleepEntry';

export default function AddRoute() {
  const { type } = useParams();
  switch (type) {
    case 'food':
    case 'drink':
      return <Screen title={type === 'food' ? 'Food' : 'Drink'}><ItemEntry key={type} kind={type} /></Screen>;
    case 'medication':
      return <Screen title="Medication"><MedEntry /></Screen>;
    case 'symptom':
    case 'stool':
    case 'activity':
      return <Screen title={type[0].toUpperCase() + type.slice(1)}><EventEntry key={type} type={type} /></Screen>;
    case 'sleep':
      return <Screen title="Sleep"><SleepEntry /></Screen>;
    default:
      return <Navigate to="/" replace />;
  }
}
