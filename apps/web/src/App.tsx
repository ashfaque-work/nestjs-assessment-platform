import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { isStaff, useAuth } from './auth/auth';
import { Page, RequireAuth, RequireStaff } from './components/Layout';
import { buttonClass } from './components/ui';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Result } from './pages/Result';
import { TakeTest } from './pages/TakeTest';
import { TestIntro } from './pages/TestIntro';
import { NewTest } from './pages/teach/NewTest';
import { TeachHome } from './pages/teach/TeachHome';
import { TestEditor } from './pages/teach/TestEditor';
import { TestResults } from './pages/teach/TestResults';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
        <Route path="/tests/:testId" element={<TestIntro />} />
        <Route path="/tests/:testId/attempt/:attemptId" element={<TakeTest />} />
        <Route path="/results/:attemptId" element={<Result />} />
        <Route element={<RequireStaff />}>
          <Route path="/teach" element={<TeachHome />} />
          <Route path="/teach/new" element={<NewTest />} />
          <Route path="/teach/tests/:testId" element={<TestEditor />} />
          <Route path="/teach/tests/:testId/results" element={<TestResults />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Students start at their tests, teachers at the tests they run
function Home() {
  const { user } = useAuth();
  return isStaff(user) ? <Navigate to="/teach" replace /> : <Dashboard />;
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
