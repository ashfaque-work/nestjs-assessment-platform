import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { canManageUsers, isStaff, useAuth } from './auth/auth';
import { Page, RequireAdmin, RequireAuth, RequireManagement, RequireStaff } from './components/Layout';
import { buttonClass } from './components/ui';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Signup } from './pages/Signup';
import { ForgotPassword, SetPassword } from './pages/PasswordReset';
import { Result } from './pages/Result';
import { TakeTest } from './pages/TakeTest';
import { TestIntro } from './pages/TestIntro';
import { NewTest } from './pages/teach/NewTest';
import { TeachHome } from './pages/teach/TeachHome';
import { TestEditor } from './pages/teach/TestEditor';
import { TestResults } from './pages/teach/TestResults';
import { TestPreview } from './pages/teach/TestPreview';
import { AdminAudit } from './pages/admin/Audit';
import { AdminHome } from './pages/admin/AdminHome';
import { AdminUsers } from './pages/admin/Users';
import { AdminSettings } from './pages/admin/Settings';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route element={<RequireAuth />}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<Home />} />
        <Route path="/tests/:testId" element={<TestIntro />} />
        <Route path="/tests/:testId/attempt/:attemptId" element={<TakeTest />} />
        <Route path="/results/:attemptId" element={<Result />} />
        <Route element={<RequireStaff />}>
          <Route path="/teach" element={<TeachHome />} />
          <Route path="/teach/new" element={<NewTest />} />
          <Route path="/teach/tests/:testId" element={<TestEditor />} />
          <Route path="/teach/tests/:testId/results" element={<TestResults />} />
          <Route path="/teach/tests/:testId/preview" element={<TestPreview />} />
        </Route>
        <Route element={<RequireManagement />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Each role lands where it works: management on the admin area, other staff on the tests they run,
// students on their own tests.
function Home() {
  const { user } = useAuth();
  if (canManageUsers(user)) return <Navigate to="/admin" replace />;
  if (isStaff(user)) return <Navigate to="/teach" replace />;
  return <Dashboard />;
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
