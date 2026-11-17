import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogApi, catalogQueryKeys } from './catalog.api.ts';

// Reference data rarely changes: fetched once per session and updated locally on creation.
const REFERENCE_DATA = { staleTime: Infinity } as const;

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'pt-BR');

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

/**
 * The created item is added to the cached list right away, so the form that opened the modal can
 * select it immediately; the list is then refetched to converge with the server. A list that was
 * never loaded is left alone (seeding it with one item would hide the others forever).
 */
interface NamedItem {
  id: string;
  name: string;
}

function useAddToList(queryKey: readonly string[]) {
  const queryClient = useQueryClient();
  return async (created: NamedItem) => {
    queryClient.setQueryData<NamedItem[]>(queryKey, (current) =>
      current === undefined
        ? undefined
        : [...current.filter((item) => item.id !== created.id), created].sort(byName),
    );
    await queryClient.invalidateQueries({ queryKey });
  };
}

export function useCreatePatient() {
  const addToList = useAddToList(catalogQueryKeys.patients);
  return useMutation({ mutationFn: catalogApi.createPatient, onSuccess: addToList });
}

export function useCreateExamType() {
  const addToList = useAddToList(catalogQueryKeys.examTypes);
  return useMutation({ mutationFn: catalogApi.createExamType, onSuccess: addToList });
}

export function useCreateProfessional() {
  const addToList = useAddToList(catalogQueryKeys.professionals);
  return useMutation({ mutationFn: catalogApi.createProfessional, onSuccess: addToList });
}
