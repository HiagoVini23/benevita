import { Route } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { AppointmentsPage } from '@/features/appointments/AppointmentsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { HomeRedirect, RequireRole } from '@/features/auth/RequireRole';
import { PatientAppointmentsPage } from '@/features/patient-portal/PatientAppointmentsPage';
import { PatientReportPage } from '@/features/patient-portal/PatientReportPage';
import { ReportPage } from '@/features/reports/ReportPage';

/**
 * Route tree for the data router (`createBrowserRouter`). A data router is required for
 * `useBlocker`, which guards the report editor against leaving with unsaved changes.
 */
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
