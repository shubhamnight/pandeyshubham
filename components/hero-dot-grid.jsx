import { createRoot } from 'react-dom/client';
import DotGrid from './ui/dot-grid.jsx';

export function mountHeroDotGrid(host, intro) {
  const root = createRoot(host);
  root.render(<DotGrid baseColor="#3a3a3a" activeColor="#ffffff" intro={intro} />);
  return () => root.unmount();
}
