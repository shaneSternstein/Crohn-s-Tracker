import { Route, Routes, useLocation } from 'react-router-dom';
import AddRoute from './features/entry/AddRoute';
import EditEntry from './features/entry/EditEntry';
import EditSleep from './features/entry/EditSleep';
import ItemEdit from './features/entry/ItemEdit';
import Home from './features/home/Home';
import Insights from './features/insights/Insights';
import ManageChips from './features/settings/ManageChips';
import ManageItems from './features/settings/ManageItems';
import Settings from './features/settings/Settings';
import Timeline from './features/timeline/Timeline';
import TabBar from './ui/TabBar';

const TAB_PATHS = ['/', '/timeline', '/insights'];

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sleep/:id" element={<EditSleep />} />
      <Route path="/chips" element={<ManageChips />} />
      <Route path="/manage" element={<ManageItems />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/add/:type" element={<AddRoute />} />
      <Route path="/edit/:id" element={<EditEntry />} />
      <Route path="/item/:id" element={<ItemEdit />} />
    </Routes>
    {TAB_PATHS.includes(pathname) && <TabBar />}
    </>
  );
}
