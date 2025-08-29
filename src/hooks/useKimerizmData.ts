import { useQuery } from '@tanstack/react-query';
import {
  fetchReferenceBand,
  fetchPatients,
  fetchSummary,
  fetchPatientDetail,
  calculateRiskLevel,
  fetchJson,
  type Patient,
  type ReferenceBand,
  type SummaryData
} from '@/lib/api';

// Referans bandı hook'u
export function useReferenceBand() {
  return useQuery({
    queryKey: ['reference-band'],
    queryFn: fetchReferenceBand,
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 30 * 60 * 1000, // 30 dakika
  });
}

// Hastalar hook'u
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    staleTime: 2 * 60 * 1000, // 2 dakika
    gcTime: 10 * 60 * 1000, // 10 dakika
  });
}

// Özet veriler hook'u
export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000, // 5 dakika
  });
}

// Hasta detay hook'u (çok kanallı)
export function usePatientDetail(patientId: string | null) {
  return useQuery({
    queryKey: ['patient-detail', patientId],
    queryFn: () => patientId ? fetchPatientDetail(patientId) : null,
    enabled: !!patientId,
    staleTime: 2 * 60 * 1000,
  });
}

// Kanal genel bakış hook'u
export function useChannelOverview() {
  return useQuery({
    queryKey: ['channelOverview'],
    queryFn: () => fetchJson('/data/channel_overview.json'),
    staleTime: 5 * 60 * 1000,
  });
}

// Dashboard için birleşik veriler
export function useDashboardData() {
  const patientsQuery = usePatients();
  const summaryQuery = useSummary();
  const referenceBandQuery = useReferenceBand();

  const processedData = patientsQuery.data?.patients.map(patient => {
    const risk = calculateRiskLevel(patient);
    return {
      ...patient,
      risk_level: risk.level,
      risk_score: risk.score,
      risk_color: risk.color,
      last_update: new Date().toISOString().split('T')[0], // Bugün
    };
  }) || [];

  // Dashboard KPI'ları hesapla
  const kpis = {
    totalPatients: summaryQuery.data?.all_patients.n_patients || 0,
    activeAlerts: processedData.filter(p => ['Kritik', 'Çok Kritik'].includes(p.risk_level)).length,
    averageRisk: processedData.length > 0 
      ? Math.round(processedData.reduce((sum, p) => sum + p.risk_score, 0) / processedData.length)
      : 0,
    lastAnalysis: new Date().toISOString(),
    patientsWithAnomalies: summaryQuery.data?.all_patients.patients_with_anomalies || 0,
  };

  return {
    patients: processedData,
    kpis,
    summary: summaryQuery.data,
    referenceBand: referenceBandQuery.data?.phase_bands || [],
    isLoading: patientsQuery.isLoading || summaryQuery.isLoading,
    error: patientsQuery.error || summaryQuery.error,
  };
}

// Faz etiketleri
export const phaseLabels: Record<number, string> = {
  0: '0–48s',
  1: 'Günlük',
  2: 'Haftalık',
  3: 'Aylık',
};

// Risk renkleri
export const riskColors = {
  'Normal': '#22c55e',
  'Dikkat': '#f59e0b',
  'Kritik': '#f97316',
  'Çok Kritik': '#ef4444',
};
