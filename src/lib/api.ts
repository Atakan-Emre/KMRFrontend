// Basit veri erişim katmanı ve risk hesaplama yardımcıları
// JSON verileri `public/data` altından fetch edilir

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | string;

export interface PatientSummary {
  total_anomalies: number;
  trend_direction?: TrendDirection;
  [key: string]: unknown;
}

export interface Patient {
  patient_code: string;
  n_measurements: number;
  latest_chr: number;
  latest_date_code?: number;
  summary: PatientSummary;
  // Aşağıdaki alanlar işlenmiş veride eklenecek (UI tarafında augment ediliyor)
  risk_level?: string;
  risk_score?: number;
  risk_color?: string;
  last_update?: string;
  [key: string]: unknown;
}

export interface ReferenceBandEntry {
  date_code: number;
  label: string;
  median: number;
  p2_5: number;
  p97_5: number;
}

export interface ReferenceBand {
  metadata?: Record<string, unknown>;
  phase_bands: ReferenceBandEntry[];
}

export interface SummaryData {
  reference_cohort: {
    n_patients: number;
    n_measurements: number;
    phase_distribution?: Record<string, number>;
  };
  all_patients: {
    n_patients: number;
    avg_measurements_per_patient?: number;
    patients_with_anomalies?: number;
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Veri yüklenemedi: ${path} (status ${response.status})`);
  }
  return response.json();
}

export async function fetchReferenceBand(): Promise<ReferenceBand> {
  return fetchJson<ReferenceBand>('/data/reference_band.json');
}

export async function fetchSummary(): Promise<SummaryData> {
  return fetchJson<SummaryData>('/data/data_summary.json');
}

export async function fetchPatients(): Promise<{ patients: Patient[] }> {
  // Kaynak dosya: public/data/patient_features.json
  const raw = await fetchJson<{ metadata?: unknown; patients: Patient[] }>(
    '/data/patient_features.json'
  );
  // minimum alanları doğrula/normalize et
  const patients: Patient[] = (raw.patients || []).map((p) => ({
    patient_code: p.patient_code,
    n_measurements: p.n_measurements,
    latest_chr: p.latest_chr,
    latest_date_code: (p as any).latest_date_code,
    summary: {
      total_anomalies: p.summary?.total_anomalies ?? 0,
      trend_direction: p.summary?.trend_direction,
      ...p.summary,
    },
    ...p,
  }));
  return { patients };
}

export async function fetchPatientDetail(patientId: string): Promise<any> {
  // Hasta detay verilerini JSON dosyasından yükle
  return fetchJson<any>(`/data/patients/${patientId}.json`);
}

type RiskLevel = 'Normal' | 'Dikkat' | 'Kritik' | 'Çok Kritik';

const riskPalette: Record<RiskLevel, string> = {
  Normal: '#22c55e',
  Dikkat: '#f59e0b',
  Kritik: '#f97316',
  'Çok Kritik': '#ef4444',
};

export function calculateRiskLevel(patient: Patient): {
  level: RiskLevel;
  score: number;
  color: string;
} {
  const chr = Number.isFinite(patient.latest_chr) ? patient.latest_chr : 0;
  let level: RiskLevel;
  if (chr < 0.5) level = 'Normal';
  else if (chr < 2.0) level = 'Dikkat';
  else if (chr < 5.0) level = 'Kritik';
  else level = 'Çok Kritik';

  const anomalies = patient.summary?.total_anomalies ?? 0;
  // 0–100 ölçeğinde pratik bir skor: kimerizm ağırlıklı + anomali katkısı
  // 5% ≈ 70 puan, >5% doyguna yaklaşır; her anomali ≈ +6 puan, 40 ile sınırlı
  const chrScore = Math.min(70, (chr / 5) * 70);
  const anomalyScore = Math.min(40, anomalies * 6);
  const score = Math.max(0, Math.min(100, Math.round(chrScore + anomalyScore)));

  return { level, score, color: riskPalette[level] };
}


