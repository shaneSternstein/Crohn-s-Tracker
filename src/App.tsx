import { Route, Routes } from 'react-router-dom';
import AddRoute from './features/entry/AddRoute';
import Home from './features/home/Home';
import Timeline from './features/timeline/Timeline';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/add/:type" element={<AddRoute />} />
    </Routes>
  );
}
