import { createBrowserRouter } from 'react-router';
import { AuthGate } from './components/AuthGate';
import { PublicProjectView } from './pages/PublicProjectView';

export const router = createBrowserRouter([
  {
    path: '/share/:token',
    Component: PublicProjectView,
  },
  {
    path: '/',
    Component: AuthGate,
  },
]);
