import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { citationsApi, libraryApi, matrixApi, type LibraryQuery } from "@/services/library.js";
import { validationApi } from "@/services/research.js";
import { keys } from "./queries.js";
import type { AcademicSource, CitationStyle, ReadingStatus } from "@/types";

/* ---------------------------------- Biblioteca ---------------------------------- */

export const useLibrary = (params: LibraryQuery) =>
  useQuery({ queryKey: keys.library(params), queryFn: () => libraryApi.list(params) });

export const useLibraryTags = () => useQuery({ queryKey: keys.libraryTags, queryFn: libraryApi.tags });

export function useLibraryMutations() {
  const client = useQueryClient();
  const invalidate = (): void => {
    void client.invalidateQueries({ queryKey: ["library"] });
    void client.invalidateQueries({ queryKey: keys.dashboard });
  };
  return {
    save: useMutation({
      mutationFn: (input: {
        source?: AcademicSource;
        sourceId?: string | null;
        projectId?: string | null;
        tags?: string[];
        notes?: string | null;
      }) => libraryApi.save(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string;
        input: { status?: ReadingStatus; notes?: string | null; projectId?: string | null; tags?: string[] };
      }) => libraryApi.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => libraryApi.remove(id), onSuccess: invalidate }),
  };
}

/* ---------------------------------- Validação ---------------------------------- */

export const useValidations = () => useQuery({ queryKey: keys.validations, queryFn: validationApi.list });

export const useValidation = (id: string) =>
  useQuery({ queryKey: keys.validation(id), queryFn: () => validationApi.get(id), enabled: Boolean(id) });

export const useValidateReference = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ reference, projectId }: { reference: string; projectId?: string | null }) =>
      validationApi.validate(reference, projectId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.validations });
      void client.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
};

export const useBulkValidate = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (references: string[]) => validationApi.validateBulk(references),
    onSuccess: () => void client.invalidateQueries({ queryKey: keys.validations }),
  });
};

export const useVerifyDoi = () =>
  useMutation({ mutationFn: ({ doi, reference }: { doi: string; reference?: string }) => validationApi.verifyDoi(doi, reference) });

/* ---------------------------------- Citações ---------------------------------- */

export const useSavedCitations = (style?: CitationStyle) =>
  useQuery({ queryKey: keys.citations(style), queryFn: () => citationsApi.saved(style) });

export const useGenerateCitations = () =>
  useMutation({
    mutationFn: ({ sourceId, styles }: { sourceId: string; styles?: CitationStyle[] }) =>
      citationsApi.generate(sourceId, styles),
  });

/* ----------------------------------- Matriz ----------------------------------- */

export const useMatrices = () => useQuery({ queryKey: keys.matrices, queryFn: matrixApi.list });

export const useMatrix = (id: string) =>
  useQuery({ queryKey: keys.matrix(id), queryFn: () => matrixApi.get(id), enabled: Boolean(id) });

export function useMatrixMutations(matrixId?: string) {
  const client = useQueryClient();
  const invalidate = (): void => {
    void client.invalidateQueries({ queryKey: keys.matrices });
    if (matrixId) void client.invalidateQueries({ queryKey: keys.matrix(matrixId) });
  };
  return {
    create: useMutation({
      mutationFn: (input: { title: string; description?: string | null }) => matrixApi.create(input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => matrixApi.remove(id), onSuccess: invalidate }),
    addEntry: useMutation({
      mutationFn: (input: { sourceId?: string; source?: AcademicSource; useAi?: boolean }) =>
        matrixApi.addEntry(matrixId as string, input),
      onSuccess: invalidate,
    }),
    updateEntry: useMutation({
      mutationFn: ({ entryId, input }: { entryId: string; input: Record<string, string | null> }) =>
        matrixApi.updateEntry(matrixId as string, entryId, input),
      onSuccess: invalidate,
    }),
    removeEntry: useMutation({
      mutationFn: (entryId: string) => matrixApi.removeEntry(matrixId as string, entryId),
      onSuccess: invalidate,
    }),
    analyze: useMutation({ mutationFn: () => matrixApi.analyze(matrixId as string) }),
  };
}
