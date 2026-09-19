import { Link, Route, Routes } from 'react-router-dom';
import { Page, RequireAuth } from './components/Layout';
import { buttonClass } from './components/ui';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Result } from './pages/Result';
import { TakeTest } from './pages/TakeTest';
import { TestIntro } from './pages/TestIntro';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tests/:testId" element={<TestIntro />} />
        <Route path="/tests/:testId/attempt/:attemptId" element={<TakeTest />} />
        <Route path="/results/:attemptId" element={<Result />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <Page>
      <h1 className="text-2xl font-bold">There is no page here</h1>
      <p className="mt-2 text-graphite-soft">The link may be old, or mistyped.</p>
      <Link to="/" className={`${buttonClass()} mt-6`}>Go to your tests</Link>
    </Page>
  );
}
