import { Route, Routes } from 'react-router-dom';
import AddRoute from './features/entry/AddRoute';
import EditEntry from './features/entry/EditEntry';
import ItemEdit from './features/entry/ItemEdit';
import Home from './features/home/Home';
import Settings from './features/settings/Settings';
import Timeline from './features/timeline/Timeline';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/add/:type" element={<AddRoute />} />
      <Route path="/edit/:id" element={<EditEntry />} />
      <Route path="/item/:id" element={<ItemEdit />} />
    </Routes>
  );
}
