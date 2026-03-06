import { createBrowserRouter } from 'react-router';
import { AuthGate } from './components/AuthGate';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AuthGate,
  },
]);
