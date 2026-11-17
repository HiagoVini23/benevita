import { Route } from 'react-router';
import { AppLayout } from './AppLayout.tsx';
import { AppointmentsPage } from '@/features/appointments/pages/AppointmentsPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { HomeRedirect, RequireRole } from '@/features/auth/components/RequireRole';
import { PatientAppointmentsPage } from '@/features/patient-portal/pages/PatientAppointmentsPage';
import { PatientReportPage } from '@/features/patient-portal/pages/PatientReportPage';
import { ReportPage } from '@/features/reports/pages/ReportPage';

/** For a data router, required by `useBlocker` in the report editor. */
export const appRoutes = (
  <>
    <Route path="/login" element={<LoginPage />} />

    <Route element={<RequireRole role="STAFF" />}>
      <Route element={<AppLayout />}>
        <Route path="/staff/appointments" element={<AppointmentsPage />} />
        <Route path="/staff/appointments/:appointmentId/report" element={<ReportPage />} />
      </Route>
    </Route>

    <Route element={<RequireRole role="PATIENT" />}>
      <Route element={<AppLayout />}>
        <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
        <Route path="/patient/appointments/:appointmentId/report" element={<PatientReportPage />} />
      </Route>
    </Route>

    <Route path="*" element={<HomeRedirect />} />
  </>
);
