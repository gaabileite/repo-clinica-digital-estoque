import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  getReceiptsControllerDetailUrl,
  getReceiptsControllerListUrl,
  getReceiptsControllerReverseUrl,
} from '@/lib/api-client';
import { ApiError, customFetch } from '@/lib/api-client/custom-fetch';
import type { NoteFilters, ReceiptNote, ReceiptNoteDetail } from './note-model';

interface NotePage {
  data: ReceiptNote[];
  page: { nextCursor: string | null; total: number };
}

export function noteError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 501) return 'O serviço de notas ainda está indisponível.';
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.status === 403) return 'Seu perfil não tem permissão para esta operação.';
    const problem = error.problem as { detail?: string } | undefined;
    if (typeof problem?.detail === 'string' && problem.detail.trim()) return problem.detail;
    if (error.status === 409) return 'O estorno não foi aceito. Confira a situação da nota e dos lotes.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export function useReceiptNotes(clinicId: string, filters: NoteFilters) {
  return useInfiniteQuery({
    queryKey: ['receipt-notes', clinicId, 'list', filters],
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }): Promise<NotePage> => {
      const params = new URLSearchParams({ limit: '50' });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      if (pageParam) params.set('cursor', pageParam);
      const { data } = await customFetch<{ data: NotePage }>(
        getReceiptsControllerListUrl(clinicId) + '?' + params.toString(),
        { signal },
      );
      if (!Array.isArray(data?.data) || typeof data.page?.total !== 'number') {
        throw new Error('Resposta inválida ao listar notas.');
      }
      return data;
    },
    getNextPageParam: (page) => page.page.nextCursor || undefined,
    retry: false,
  });
}

export function useReceiptNote(clinicId: string, noteId: string) {
  return useQuery({
    queryKey: ['receipt-notes', clinicId, 'detail', noteId],
    queryFn: async ({ signal }) => {
      const { data } = await customFetch<{ data: ReceiptNoteDetail }>(
        getReceiptsControllerDetailUrl(clinicId, noteId),
        { signal },
      );
      if (!Array.isArray(data?.lines)) throw new Error('Resposta inválida ao consultar a nota.');
      return data;
    },
    retry: false,
  });
}

export function useReverseReceiptNote(clinicId: string, noteId: string) {
  const client = useQueryClient();
  const attempt = useRef<{ justification: string; key: string } | null>(null);

  return useMutation({
    mutationFn: async (justification: string) => {
      if (attempt.current?.justification !== justification) {
        attempt.current = { justification, key: crypto.randomUUID() };
      }
      // Corpo provisório até o backend publicar o DTO da E-31.
      await customFetch(getReceiptsControllerReverseUrl(clinicId, noteId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.current.key },
        body: JSON.stringify({ justification }),
      });
    },
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['receipt-notes', clinicId] }),
        client.invalidateQueries({ queryKey: ['stock', 'balances', clinicId] }),
        client.invalidateQueries({ queryKey: ['stock', 'lots', clinicId] }),
        client.invalidateQueries({ queryKey: ['movements', clinicId] }),
      ]);
    },
  });
}
