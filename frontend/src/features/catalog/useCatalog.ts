import { useQuery } from '@tanstack/react-query';
import { catalogApi, catalogQueryKeys } from './catalog.api.ts';

// Reference data does not change while the app is open, so it is fetched once per session.
const REFERENCE_DATA = { staleTime: Infinity } as const;

export function usePatients() {
  return useQuery({
    queryKey: catalogQueryKeys.patients,
    queryFn: catalogApi.patients,
    ...REFERENCE_DATA,
  });
}

export function useExamTypes() {
  return useQuery({
    queryKey: catalogQueryKeys.examTypes,
    queryFn: catalogApi.examTypes,
    ...REFERENCE_DATA,
  });
}

export function useProfessionals() {
  return useQuery({
    queryKey: catalogQueryKeys.professionals,
    queryFn: catalogApi.professionals,
    ...REFERENCE_DATA,
  });
}
