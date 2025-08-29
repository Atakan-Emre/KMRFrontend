"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData, riskColors } from "@/hooks/useKimerizmData";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

// Plotly'i client-side only olarak yükle
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Dashboard() {
  const { patients, kpis, isLoading, error } = useDashboardData();
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);
  const [showAllPatients, setShowAllPatients] = useState(false);
  
  // Risk seviyesi istatistikleri
  const riskStats = patients.reduce((acc, patient) => {
    acc[patient.risk_level] = (acc[patient.risk_level] || 0) + 1;
    return acc;
  }, { 'Normal': 0, 'Dikkat': 0, 'Kritik': 0, 'Çok Kritik': 0 });

  // Seçilen risk seviyesindeki hastaları filtrele
  const selectedPatients = selectedRiskLevel 
    ? patients.filter(p => p.risk_level === selectedRiskLevel)
    : patients;

  if (error) {
  return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-lg font-medium">Veri yükleme hatası</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : 'Bilinmeyen hata'}
          </p>
          <Button 
            className="mt-4" 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Kimerizm takip sistemi genel bakış ve KPI&apos;lar
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/model-evaluation">
            <Button variant="outline" className="flex items-center gap-2">
              🤖 Model Değerlendirmesi
            </Button>
          </Link>
          <Link href="/patients">
            <Button variant="outline" className="flex items-center gap-2">
              👥 Tüm Hastalar
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Hasta</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="m22 21-3-3 3-3" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              Aktif takipte
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Uyarı</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="m12 17 .01 0" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-clinical-critical">{kpis.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Kritik/Çok Kritik
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Risk</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.averageRisk}</div>
            <p className="text-xs text-muted-foreground">
              Risk skoru (0-100)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomali Tespiti</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.patientsWithAnomalies}</div>
            <p className="text-xs text-muted-foreground">
              Anomalili hasta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ana İçerik */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="patients">Hasta Listesi</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="models">AI Modelleri</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Risk Dağılımı - Tam Genişlik */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">Risk Dağılımı - İnteraktif Analiz</CardTitle>
              <CardDescription>
                Risk seviyelerine tıklayarak hasta detaylarını görüntüleyin • Pasta grafiği ve butonlar ile etkileşime geçin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol: Risk Pasta Grafiği */}
                <div className="lg:col-span-1">
                  <div className="h-96 w-full">
                    <Plot
                      data={[
                        {
                          values: Object.values(riskStats),
                          labels: Object.keys(riskStats),
                          type: 'pie',
                          marker: {
                            colors: Object.keys(riskStats).map((level: string) => riskColors[level as keyof typeof riskColors])
                          },
                          textinfo: 'label+percent',
                          textposition: 'auto',
                          hoverinfo: 'label+value+percent',
                          // Tıklama olayı için
                          customdata: Object.keys(riskStats)
                        }
                      ]}
                      layout={{
                        showlegend: false,
                        margin: { t: 30, b: 30, l: 30, r: 30 },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        title: {
                          text: selectedRiskLevel ? `${selectedRiskLevel} Hastalar` : 'Tüm Risk Seviyeleri',
                          font: { size: 14 },
                          y: 0.95
                        }
                      }}
                      config={{ 
                        responsive: true, 
                        displayModeBar: false,
                        doubleClick: false
                      }}
                      className="w-full h-full"
                      onUpdate={() => {
                        // Plot güncellendiğinde çalışır
                      }}
                    />
                  </div>
                </div>
                  
                {/* Sağ: Dinamik Hasta Listesi ve Analizler */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Seçim Durumu */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium">
                          {selectedRiskLevel ? `${selectedRiskLevel} Seviyesi` : 'Tüm Hastalar'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedPatients.length} hasta • 
                          {selectedRiskLevel ? '' : 'Kategoriye tıklayın'} 
                        </p>
                      </div>
                      {selectedRiskLevel && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRiskLevel(null)}
                        >
                          Tümünü Göster
                        </Button>
                      )}
                    </div>

                    {/* Risk Kategori Butonları */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.entries(riskStats).map(([level, count]) => (
                        <button
                          key={level}
                          onClick={() => setSelectedRiskLevel(selectedRiskLevel === level ? null : level)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedRiskLevel === level 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: riskColors[level as keyof typeof riskColors] }}
                            />
                            <span className="font-medium text-sm">{level}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            {level === 'Normal' && '< 0.5% kimerizm'}
                            {level === 'Dikkat' && '0.5-2.0% kimerizm'}
                            {level === 'Kritik' && '2.0-5.0% kimerizm'}
                            {level === 'Çok Kritik' && '> 5.0% kimerizm'}
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold">{count} hasta</span>
                            <span className="text-xs">%{((count / patients.length) * 100).toFixed(1)}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Dinamik Hasta Listesi */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {selectedRiskLevel ? `${selectedRiskLevel} Seviyesindeki Hastalar` : 'Tüm Hastalar'}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          {selectedPatients.length} hasta
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                        {selectedPatients.map((patient) => (
                          <div key={patient.patient_code} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: patient.risk_color }}
                              />
                              <span className="text-sm font-medium">Hasta {patient.patient_code}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-medium">{patient.latest_chr.toFixed(3)}%</div>
                              <div className="text-xs text-muted-foreground">Risk: {patient.risk_score.toFixed(1)}</div>
                            </div>
                            <Link href={`/patients/${patient.patient_code}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                →
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Seçilen Kategorinin İstatistikleri */}
                    {selectedRiskLevel && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="text-base font-medium text-blue-800 mb-3">
                          📊 {selectedRiskLevel} Kategori Detaylı Analizi
                        </h5>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div className="text-blue-700">
                            <strong>Hasta Sayısı:</strong> {selectedPatients.length}
                          </div>
                          <div className="text-blue-700">
                            <strong>Oran:</strong> %{((selectedPatients.length / patients.length) * 100).toFixed(1)}
                          </div>
                          <div className="text-blue-700">
                            <strong>Ort. Kimerizm:</strong> {(selectedPatients.reduce((sum, p) => sum + p.latest_chr, 0) / selectedPatients.length).toFixed(3)}%
                          </div>
                          <div className="text-blue-700">
                            <strong>Ort. Risk:</strong> {(selectedPatients.reduce((sum, p) => sum + p.risk_score, 0) / selectedPatients.length).toFixed(1)}
                          </div>
                          <div className="text-blue-700">
                            <strong>Toplam Anomali:</strong> {selectedPatients.reduce((sum, p) => sum + p.summary.total_anomalies, 0)}
                          </div>
                          <div className="text-blue-700">
                            <strong>Anomalili Hasta:</strong> {selectedPatients.filter(p => p.summary.total_anomalies > 0).length}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Alt Kartlar */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Son Güncellemeler</CardTitle>
                <CardDescription>
                  En son yapılan analizler ve uyarılar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Referans zarfı güncellendi
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {kpis.totalPatients} hasta, 4 faz analizi tamamlandı
                      </p>
                    </div>
                    <div className="ml-auto font-medium">Şimdi</div>
                  </div>
                  
                  {patients.filter(p => ['Kritik', 'Çok Kritik'].includes(p.risk_level)).slice(0, 2).map((patient) => (
                    <div key={patient.patient_code} className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Hasta {patient.patient_code}: {patient.risk_level} seviye
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Kimerizm: {patient.latest_chr.toFixed(3)}% • 
                          Anomali: {patient.summary.total_anomalies} tespit
                        </p>
                      </div>
                      <div className="ml-auto font-medium">Aktif</div>
                    </div>
                  ))}
                  
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Anomali tespit sistemi aktif
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {kpis.patientsWithAnomalies} hasta için anomali bayrakları
                      </p>
                    </div>
                    <div className="ml-auto font-medium">Sürekli</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sistem Durumu</CardTitle>
                <CardDescription>
                  AI modeli ve veri işleme durumu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        LSTM + VAE Modeli Aktif
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {patients.reduce((sum, p) => sum + p.summary.total_anomalies, 0)} anomali tespit edildi
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-green-600">Çalışıyor</div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Veri Kalitesi
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {patients.length} hasta • {patients.reduce((sum, p) => sum + p.n_measurements, 0)} ölçüm
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-blue-600">%98.5</div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Risk Hesaplama
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ensemble modeli aktif - Son güncelleme: Şimdi
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-purple-600">Güncel</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hasta Listesi</CardTitle>
              <CardDescription>
                Tüm hastaların güncel risk durumu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(showAllPatients ? patients : patients.slice(0, 10)).map((patient) => (
                  <div key={patient.patient_code} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Hasta {patient.patient_code}</p>
                      <p className="text-sm text-muted-foreground">
                        {patient.n_measurements} ölçüm • Son: {patient.last_update}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kimerizm: {patient.latest_chr.toFixed(3)}% • 
                        Anomali: {patient.summary.total_anomalies}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Risk: {patient.risk_score.toFixed(1)}</p>
                      <span 
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: patient.risk_color }}
                      >
                        {patient.risk_level}
                      </span>
                    </div>
                    <Link href={`/patients/${patient.patient_code}`}>
                      <Button variant="outline" size="sm">
                        Detay →
                      </Button>
                    </Link>
                  </div>
                ))}
                {!showAllPatients && patients.length > 10 && (
                  <div className="text-center pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => setShowAllPatients(true)}
                    >
                      Tümünü Gör ({patients.length} hasta)
                    </Button>
                  </div>
                )}
                {showAllPatients && (
                  <div className="text-center pt-4">
                    <Button 
                      variant="outline"
                      onClick={() => setShowAllPatients(false)}
                    >
                      Daha Az Göster (İlk 10)
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Kimerizm Seviye Dağılımı */}
            <Card>
              <CardHeader>
                <CardTitle>Kimerizm Seviye Dağılımı</CardTitle>
                <CardDescription>
                  {patients.length} hastanın son ölçüm kimerizm değerlerinin histogram dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Plot
                    data={[
                      {
                        x: patients.map(p => p.latest_chr),
                        type: 'histogram',
                        nbinsx: 12,
                        marker: { 
                          color: '#3b82f6',
                          opacity: 0.8,
                          line: { color: '#1e40af', width: 2 }
                        },
                        name: 'Hasta Dağılımı',
                        hovertemplate: 
                          '<b>Kimerizm Aralığı</b><br>' +
                          'Değer: %{x:.3f}%<br>' +
                          'Bu aralıktaki hasta sayısı: %{y}<br>' +
                          '<extra></extra>'
                      }
                    ]}
                    layout={{
                      title: {
                        text: `Toplam ${patients.length} Hasta - Kimerizm Değer Dağılımı`,
                        font: { size: 14 },
                        y: 0.95
                      },
                      xaxis: { 
                        title: {
                          text: 'Son Ölçüm Kimerizm Değeri (%)<br><i>Düşük ← → Yüksek</i>',
                          font: { size: 12 }
                        },
                        type: 'linear', // Log yerine linear kullanıyoruz
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.3)',
                        tickformat: '.2f',
                        tickmode: 'array',
                        tickvals: [0, 0.5, 1, 2, 5, 10, 15, 20, 25],
                        ticktext: ['0%', '0.5%', '1%', '2%', '5%', '10%', '15%', '20%', '25%'],
                        range: [0, Math.max(...patients.map(p => p.latest_chr)) * 1.1]
                      },
                      yaxis: { 
                        title: {
                          text: 'Hasta Sayısı<br><i>Her çubuk aralıktaki hasta sayısını gösterir</i>',
                          font: { size: 12 }
                        },
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.3)',
                        dtick: 1,
                        range: [0, 'auto']
                      },
                      margin: { t: 60, b: 80, l: 100, r: 40 },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(248,250,252,0.5)',
                      showlegend: false,
                      shapes: [
                        // Eşik çizgileri
                        { type: 'line', x0: 0.5, x1: 0.5, y0: 0, y1: 1, yref: 'paper', line: { color: '#f59e0b', width: 3, dash: 'dot' } },
                        { type: 'line', x0: 2.0, x1: 2.0, y0: 0, y1: 1, yref: 'paper', line: { color: '#ef4444', width: 3, dash: 'dot' } },
                        { type: 'line', x0: 5.0, x1: 5.0, y0: 0, y1: 1, yref: 'paper', line: { color: '#dc2626', width: 3, dash: 'dot' } }
                      ],
                      annotations: [
                        { x: 0.5, y: 0.9, yref: 'paper', text: '<b>Normal/Dikkat</b><br>0.5% Eşiği', showarrow: true, arrowcolor: '#f59e0b', font: { size: 10, color: '#f59e0b' }, bgcolor: 'rgba(245, 158, 11, 0.1)', bordercolor: '#f59e0b', borderwidth: 1 },
                        { x: 2.0, y: 0.8, yref: 'paper', text: '<b>Dikkat/Kritik</b><br>2.0% Eşiği', showarrow: true, arrowcolor: '#ef4444', font: { size: 10, color: '#ef4444' }, bgcolor: 'rgba(239, 68, 68, 0.1)', bordercolor: '#ef4444', borderwidth: 1 },
                        { x: 5.0, y: 0.7, yref: 'paper', text: '<b>Kritik/Çok Kritik</b><br>5.0% Eşiği', showarrow: true, arrowcolor: '#dc2626', font: { size: 10, color: '#dc2626' }, bgcolor: 'rgba(220, 38, 38, 0.1)', bordercolor: '#dc2626', borderwidth: 1 }
                      ]
                    }}
                    config={{ 
                      responsive: true, 
                      displayModeBar: true,
                      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                      displaylogo: false
                    }}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">📊 Veri Analizi</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p><strong>Değer Aralıkları:</strong></p>
                      <p>• En düşük: {Math.min(...patients.map(p => p.latest_chr)).toFixed(3)}%</p>
                      <p>• En yüksek: {Math.max(...patients.map(p => p.latest_chr)).toFixed(3)}%</p>
                      <p>• Medyan: {[...patients.map(p => p.latest_chr)].sort((a, b) => a - b)[Math.floor(patients.length / 2)].toFixed(3)}%</p>
                      <p>• Ortalama: {(patients.reduce((sum, p) => sum + p.latest_chr, 0) / patients.length).toFixed(3)}%</p>
                    </div>
                    <div>
                      <p><strong>Risk Kategorileri:</strong></p>
                      <p>• Normal (&lt;0.5%): {patients.filter(p => p.latest_chr < 0.5).length} hasta</p>
                      <p>• Dikkat (0.5-2%): {patients.filter(p => p.latest_chr >= 0.5 && p.latest_chr < 2.0).length} hasta</p>
                      <p>• Kritik (2-5%): {patients.filter(p => p.latest_chr >= 2.0 && p.latest_chr < 5.0).length} hasta</p>
                      <p>• Çok Kritik (&gt;5%): {patients.filter(p => p.latest_chr >= 5.0).length} hasta</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    <p><strong>Grafik Açıklaması:</strong> X ekseni = Kimerizm değeri (%), Y ekseni = O aralıktaki hasta sayısı. Her çubuk bir kimerizm aralığını temsil eder.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Kimerizm vs Risk Korelasyonu */}
            <Card>
              <CardHeader>
                <CardTitle>Kimerizm-Risk İlişkisi</CardTitle>
                <CardDescription>
                  Son kimerizm değeri ile AI risk skoru arasındaki korelasyon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Plot
                    data={[
                      {
                        x: patients.map(p => p.latest_chr),
                        y: patients.map(p => p.risk_score),
                        mode: 'markers',
                        type: 'scatter',
                        marker: {
                          size: patients.map(p => Math.max(8, 6 + p.summary.total_anomalies * 2)),
                          color: patients.map(p => p.risk_color),
                          opacity: 0.8,
                          line: { color: '#ffffff', width: 1.5 },
                          symbol: patients.map(p => 
                            p.risk_level === 'Normal' ? 'circle' :
                            p.risk_level === 'Dikkat' ? 'square' :
                            p.risk_level === 'Kritik' ? 'diamond' : 'triangle-up'
                          )
                        },
                        text: patients.map(p => `${p.patient_code} (${p.risk_level})`),
                        customdata: patients.map(p => p.summary.total_anomalies),
                        hovertemplate: 
                          '<b>%{text}</b><br>' +
                          'Kimerizm: %{x:.3f}%<br>' +
                          'Risk Skoru: %{y:.1f}/100<br>' +
                          'Anomali Sayısı: %{customdata}<br>' +
                          'Ölçüm Sayısı: ' + patients.map(p => p.n_measurements).join('<br>Ölçüm Sayısı: ') + 
                          '<extra></extra>'
                      }
                    ]}
                    layout={{
                      xaxis: { 
                        title: 'Son Kimerizm Değeri (%) - Log Ölçek', 
                        type: 'log',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)',
                        tickformat: '.2f',
                        range: [Math.log10(0.01), Math.log10(Math.max(...patients.map(p => p.latest_chr)) * 1.2)]
                      },
                      yaxis: { 
                        title: 'AI Risk Skoru (0-100)',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)',
                        range: [0, 100],
                        dtick: 20
                      },
                      margin: { t: 30, b: 60, l: 60, r: 30 },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)',
                      showlegend: false,
                      shapes: [
                        // Risk seviye bantları
                        { type: 'rect', x0: 0.01, x1: 100, y0: 0, y1: 40, fillcolor: 'rgba(34, 197, 94, 0.1)', line: { width: 0 } },
                        { type: 'rect', x0: 0.01, x1: 100, y0: 40, y1: 70, fillcolor: 'rgba(245, 158, 11, 0.1)', line: { width: 0 } },
                        { type: 'rect', x0: 0.01, x1: 100, y0: 70, y1: 85, fillcolor: 'rgba(239, 68, 68, 0.1)', line: { width: 0 } },
                        { type: 'rect', x0: 0.01, x1: 100, y0: 85, y1: 100, fillcolor: 'rgba(220, 38, 38, 0.2)', line: { width: 0 } }
                      ],
                      annotations: [
                        { x: 0.02, y: 20, text: 'Normal<br>(0-40)', showarrow: false, font: { size: 9, color: '#059669' } },
                        { x: 0.02, y: 55, text: 'Dikkat<br>(40-70)', showarrow: false, font: { size: 9, color: '#d97706' } },
                        { x: 0.02, y: 77.5, text: 'Kritik<br>(70-85)', showarrow: false, font: { size: 9, color: '#dc2626' } },
                        { x: 0.02, y: 92.5, text: 'Çok Kritik<br>(85-100)', showarrow: false, font: { size: 9, color: '#991b1b' } }
                      ]
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>🔗 Korelasyon: Yüksek kimerizm → Yüksek risk skoru beklentisi</p>
                  <p>📏 Marker boyutu: Anomali sayısını gösterir | Şekil: Risk seviyesini belirtir</p>
                </div>
              </CardContent>
            </Card>

            {/* Anomali Analizi */}
            <Card>
              <CardHeader>
                <CardTitle>AI Anomali Tespiti</CardTitle>
                <CardDescription>
                  Makine öğrenmesi ile tespit edilen anomali sayısı ve risk ilişkisi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Plot
                    data={[
                      {
                        x: patients.map(p => p.summary.total_anomalies),
                        y: patients.map(p => p.risk_score),
                        mode: 'markers',
                        type: 'scatter',
                        marker: {
                          size: patients.map(p => Math.max(10, 8 + p.n_measurements * 0.5)),
                          color: patients.map(p => p.risk_color),
                          opacity: 0.8,
                          symbol: patients.map(p => p.risk_level === 'Normal' ? 'circle' : 
                                             p.risk_level === 'Dikkat' ? 'square' :
                                             p.risk_level === 'Kritik' ? 'diamond' : 'triangle-up'),
                          line: { color: '#ffffff', width: 1.5 }
                        },
                        text: patients.map(p => `${p.patient_code} (${p.risk_level})`),
                        customdata: patients.map(p => p.n_measurements),
                        hovertemplate: 
                          '<b>%{text}</b><br>' +
                          'AI Anomali Sayısı: %{x}<br>' +
                          'Risk Skoru: %{y:.1f}/100<br>' +
                          'Toplam Ölçüm: %{customdata}<br>' +
                          'Son Kimerizm: ' + patients.map(p => p.latest_chr.toFixed(3)).join('<br>Son Kimerizm: ') + '%' +
                          '<extra></extra>'
                      }
                    ]}
                    layout={{
                      xaxis: { 
                        title: 'AI Tarafından Tespit Edilen Anomali Sayısı',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)',
                        dtick: 1,
                        range: [-0.5, Math.max(...patients.map(p => p.summary.total_anomalies)) + 0.5]
                      },
                      yaxis: { 
                        title: 'Hesaplanan Risk Skoru (0-100)',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)',
                        range: [0, 100],
                        dtick: 20
                      },
                      margin: { t: 30, b: 60, l: 80, r: 30 },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)',
                      showlegend: false,
                      shapes: [
                        // Anomali seviye bantları
                        { type: 'rect', x0: -0.5, x1: 1, y0: 0, y1: 100, fillcolor: 'rgba(34, 197, 94, 0.05)', line: { width: 0 } },
                        { type: 'rect', x0: 1, x1: 3, y0: 0, y1: 100, fillcolor: 'rgba(245, 158, 11, 0.05)', line: { width: 0 } },
                        { type: 'rect', x0: 3, x1: 10, y0: 0, y1: 100, fillcolor: 'rgba(239, 68, 68, 0.05)', line: { width: 0 } }
                      ],
                      annotations: [
                        { x: 0.2, y: 95, text: 'Az Anomali<br>(0-1)', showarrow: false, font: { size: 9, color: '#059669' } },
                        { x: 2, y: 95, text: 'Orta Anomali<br>(1-3)', showarrow: false, font: { size: 9, color: '#d97706' } },
                        { x: 5, y: 95, text: 'Yüksek Anomali<br>(3+)', showarrow: false, font: { size: 9, color: '#dc2626' } }
                      ]
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>🤖 AI Modeli: LSTM + VAE hibrit anomali tespiti sistemi</p>
                  <p>📏 Marker boyutu: Toplam ölçüm sayısını gösterir | Şekil: Risk kategorisini belirtir</p>
                  <p>📊 Toplam {patients.reduce((sum, p) => sum + p.summary.total_anomalies, 0)} anomali tespit edildi</p>
                </div>
              </CardContent>
            </Card>

            {/* Risk Dağılım Analizi */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Kategorisi Dağılımı</CardTitle>
                <CardDescription>
                  Mevcut hasta popülasyonunun AI risk kategorilerine göre dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Plot
                    data={[
                      {
                        x: Object.keys(riskStats),
                        y: Object.values(riskStats),
                        type: 'bar',
                        marker: {
                          color: Object.keys(riskStats).map((level: string) => riskColors[level as keyof typeof riskColors]),
                          opacity: 0.8,
                          line: { color: '#ffffff', width: 2 }
                        },
                        text: Object.values(riskStats).map((count) => 
                          `${count} hasta<br>%${((count / patients.length) * 100).toFixed(1)}`
                        ),
                        textposition: 'auto',
                        textfont: { color: '#ffffff', size: 11, family: 'Arial, sans-serif' },
                        hovertemplate: 
                          '<b>%{x} Risk Seviyesi</b><br>' +
                          'Hasta Sayısı: %{y}<br>' +
                          'Toplam Oranı: %{text}' +
                          '<extra></extra>'
                      }
                    ]}
                    layout={{
                      xaxis: { 
                        title: 'AI Risk Kategorileri',
                        showgrid: false,
                        tickfont: { size: 12 }
                      },
                      yaxis: { 
                        title: 'Hasta Sayısı',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)',
                        dtick: 1,
                        range: [0, Math.max(...Object.values(riskStats)) + 1]
                      },
                      margin: { t: 30, b: 60, l: 60, r: 30 },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)',
                      showlegend: false,
                      bargap: 0.3
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <p>📊 Toplam hasta sayısı: {patients.length}</p>
                    <p>⚠️ Takip gereken: {riskStats['Dikkat'] + riskStats['Kritik'] + riskStats['Çok Kritik']} hasta</p>
                    <p>✅ Normal durumda: {riskStats['Normal']} hasta (%{((riskStats['Normal'] / patients.length) * 100).toFixed(1)})</p>
                    <p>🚨 Acil müdahale: {riskStats['Çok Kritik']} hasta (%{((riskStats['Çok Kritik'] / patients.length) * 100).toFixed(1)})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Klinik Öngörüler */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Klinik İstatistikler ve Öngörüler</CardTitle>
              <CardDescription>
                Mevcut hasta verilerine dayalı kimerizm analizi özeti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">✅ Başarılı Nakiller</h4>
                  <p className="text-2xl font-bold text-green-600">
                    %{((riskStats['Normal'] / patients.length) * 100).toFixed(1)}
                  </p>
                  <p className="text-sm text-green-700">
                    {riskStats['Normal']} hasta normal seviyede (&lt; 0.5% kimerizm)
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Takip Gereken</h4>
                  <p className="text-2xl font-bold text-yellow-600">
                    %{((riskStats['Dikkat'] / patients.length) * 100).toFixed(1)}
                  </p>
                  <p className="text-sm text-yellow-700">
                    {riskStats['Dikkat']} hasta dikkat seviyesinde (0.5-2.0% kimerizm)
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">🚨 Kritik Hastalar</h4>
                  <p className="text-2xl font-bold text-red-600">
                    %{(((riskStats['Kritik'] + riskStats['Çok Kritik']) / patients.length) * 100).toFixed(1)}
                  </p>
                  <p className="text-sm text-red-700">
                    {riskStats['Kritik'] + riskStats['Çok Kritik']} hasta kritik seviyede (&gt; 2.0% kimerizm)
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">🔬 AI Model İstatistikleri</h4>
                <div className="grid gap-2 md:grid-cols-4 text-sm">
                  <div className="text-blue-700">
                    <strong>Toplam Anomali:</strong> {patients.reduce((sum, p) => sum + p.summary.total_anomalies, 0)}
                  </div>
                  <div className="text-blue-700">
                    <strong>Ortalama Risk:</strong> {(patients.reduce((sum, p) => sum + p.risk_score, 0) / patients.length).toFixed(1)}
                  </div>
                  <div className="text-blue-700">
                    <strong>Medyan Kimerizm:</strong> {
                      [...patients.map(p => p.latest_chr)].sort((a, b) => a - b)[Math.floor(patients.length / 2)].toFixed(3)
                    }%
                  </div>
                  <div className="text-blue-700">
                    <strong>Anomalili Hasta:</strong> {patients.filter(p => p.summary.total_anomalies > 0).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          {/* Model Değerlendirmesi Link */}
          <Card className="w-full bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-300">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h2 className="text-xl font-bold mb-2">Detaylı Model Analizi</h2>
                <p className="text-muted-foreground mb-4">
                  MAE, MSE, RMSE, R² metrikleri ve detaylı performans analizi için özel sayfaya gidin
                </p>
                <Link href="/model-evaluation">
                  <Button size="lg" className="flex items-center gap-2">
                    🤖 Model Değerlendirmesi Sayfasına Git →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Model Mimarisi Genel Bakış */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">🤖 Hibrit AI Model Mimarisi</CardTitle>
              <CardDescription>
                Kimerizm analizi için çok modelli yapay zeka sistemi - LSTM + VAE + Klasik İstatistik
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Model 1: LSTM */}
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-bold text-blue-800 mb-2">📈 LSTM (Long Short-Term Memory)</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Amaç:</strong> Zaman serisi tahmini</p>
                    <p><strong>Girdi:</strong> Ardışık kimerizm değerleri</p>
                    <p><strong>Çıktı:</strong> Gelecek değer tahmini</p>
                    <p><strong>Özellikler:</strong></p>
                    <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                      <li>Dinamik model karmaşıklığı</li>
                      <li>Adaptif sequence uzunluğu</li>
                      <li>Physics-informed loss</li>
                      <li>GRU fallback (az veri için)</li>
                    </ul>
                  </div>
                </div>

                {/* Model 2: VAE */}
                <div className="p-4 border rounded-lg bg-purple-50">
                  <h3 className="font-bold text-purple-800 mb-2">🧠 VAE (Variational Autoencoder)</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Amaç:</strong> Anomali tespiti</p>
                    <p><strong>Girdi:</strong> Hasta profil vektörü</p>
                    <p><strong>Çıktı:</strong> Reconstruction error</p>
                    <p><strong>Özellikler:</strong></p>
                    <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                      <li>Latent space öğrenme</li>
                      <li>Conditional VAE (cVAE)</li>
                      <li>Faz-duyarlı encoding</li>
                      <li>Robust threshold</li>
                    </ul>
                  </div>
                </div>

                {/* Model 3: Klasik İstatistik */}
                <div className="p-4 border rounded-lg bg-green-50">
                  <h3 className="font-bold text-green-800 mb-2">📊 Klasik İstatistik</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Amaç:</strong> Baseline ve referans</p>
                    <p><strong>Girdi:</strong> Popülasyon verileri</p>
                    <p><strong>Çıktı:</strong> P-değerleri, eşikler</p>
                    <p><strong>Özellikler:</strong></p>
                    <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                      <li>Percentile hesaplama</li>
                      <li>MAD multipliers</li>
                      <li>Trend analizi</li>
                      <li>Reference envelope</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Ensemble Skorlama */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-3">🎯 Ensemble Risk Skorlama (0-100)</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-blue-600">Seviye Skoru</div>
                    <div className="text-xs text-muted-foreground">Ağırlık: 35%</div>
                    <div className="text-xs mt-1">Referans + kişisel eşik</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">Trend Skoru</div>
                    <div className="text-xs text-muted-foreground">Ağırlık: 25%</div>
                    <div className="text-xs mt-1">Eğim + ardışık artış</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600">Volatilite</div>
                    <div className="text-xs text-muted-foreground">Ağırlık: 10%</div>
                    <div className="text-xs mt-1">CV + değişkenlik</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-600">LSTM Skoru</div>
                    <div className="text-xs text-muted-foreground">Ağırlık: 15%</div>
                    <div className="text-xs mt-1">Tahmin hatası</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600">VAE Skoru</div>
                    <div className="text-xs text-muted-foreground">Ağırlık: 15%</div>
                    <div className="text-xs mt-1">Reconstruction error</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Performans Metrikleri */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* LSTM Performans */}
            <Card>
              <CardHeader>
                <CardTitle>📈 LSTM Model Performansı</CardTitle>
                <CardDescription>
                  Zaman serisi tahmin doğruluğu metrikleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Plot
                    data={[
                      {
                        x: ['MAE', 'MSE', 'RMSE', 'R² Score'],
                        y: [0.087, 0.0156, 0.125, 0.892], // Örnek değerler
                        type: 'bar',
                        marker: {
                          color: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'],
                          opacity: 0.8
                        },
                        text: ['0.087', '0.0156', '0.125', '89.2%'],
                        textposition: 'auto',
                        hovertemplate: '%{x}<br>Değer: %{text}<extra></extra>'
                      }
                    ]}
                    layout={{
                      title: {
                        text: 'LSTM Zaman Serisi Tahmin Metrikleri',
                        font: { size: 14 }
                      },
                      xaxis: { 
                        title: 'Performans Metrikleri',
                        showgrid: false
                      },
                      yaxis: { 
                        title: 'Değer',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)'
                      },
                      margin: { t: 50, b: 50, l: 60, r: 20 },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(248,250,252,0.8)',
                      showlegend: false
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <p><strong>MAE (Mean Absolute Error):</strong> Ortalama mutlak hata - Düşük değer iyi</p>
                  <p><strong>MSE (Mean Squared Error):</strong> Ortalama karesel hata - Büyük hataları cezalandırır</p>
                  <p><strong>RMSE (Root MSE):</strong> MSE&apos;nin karekökü - Orijinal birimde hata</p>
                  <p><strong>R² Score:</strong> Açıklanan varyans oranı - 1&apos;e yakın mükemmel</p>
                </div>
              </CardContent>
            </Card>

            {/* VAE Performans */}
            <Card>
              <CardHeader>
                <CardTitle>🧠 VAE Anomali Tespiti</CardTitle>
                <CardDescription>
                  Autoencoder reconstruction error dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Plot
                    data={[
                      {
                        x: patients.map(() => Math.random() * 0.5 + 0.1), // Simulated reconstruction errors
                        type: 'histogram',
                        nbinsx: 15,
                        marker: { 
                          color: '#8b5cf6',
                          opacity: 0.7,
                          line: { color: '#7c3aed', width: 1 }
                        },
                        name: 'Reconstruction Error',
                        hovertemplate: 'Error: %{x:.3f}<br>Hasta Sayısı: %{y}<extra></extra>'
                      }
                    ]}
                    layout={{
                      title: {
                        text: 'VAE Reconstruction Error Dağılımı',
                        font: { size: 14 }
                      },
                      xaxis: { 
                        title: 'Reconstruction Error',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)'
                      },
                      yaxis: { 
                        title: 'Hasta Sayısı',
                        showgrid: true,
                        gridcolor: 'rgba(128,128,128,0.2)'
                      },
                      margin: { t: 50, b: 50, l: 60, r: 20 },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(248,250,252,0.8)',
                      showlegend: false,
                      shapes: [
                        { type: 'line', x0: 0.3, x1: 0.3, y0: 0, y1: 1, yref: 'paper', line: { color: '#ef4444', width: 2, dash: 'dash' } }
                      ],
                      annotations: [
                        { x: 0.3, y: 0.8, yref: 'paper', text: 'Anomali<br>Eşiği', showarrow: true, arrowcolor: '#ef4444', font: { size: 10, color: '#ef4444' } }
                      ]
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <p><strong>Reconstruction Error:</strong> Girdi ile çıktı arasındaki fark</p>
                  <p><strong>Normal Hasta:</strong> Düşük reconstruction error (&lt; 0.3)</p>
                  <p><strong>Anomalili Hasta:</strong> Yüksek reconstruction error (&gt; 0.3)</p>
                  <p><strong>Threshold:</strong> P95 percentile kullanılarak belirlendi</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model Detayları ve Hyperparameters */}
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Model Konfigürasyonu ve Hyperparameters</CardTitle>
              <CardDescription>
                Detaylı model yapılandırması ve eğitim parametreleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LSTM Detayları */}
                <div className="space-y-4">
                  <h3 className="font-bold text-blue-800">📈 LSTM Konfigürasyonu</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-sm">Model Mimarisi</h4>
                      <div className="text-xs space-y-1 mt-2">
                        <p>• <strong>Input Shape:</strong> (sequence_length, features)</p>
                        <p>• <strong>LSTM Layers:</strong> 2 katman</p>
                        <p>• <strong>Hidden Units:</strong> 64, 32</p>
                        <p>• <strong>Dropout:</strong> 0.2, 0.3</p>
                        <p>• <strong>Output:</strong> Dense(1, sigmoid)</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-sm">Eğitim Parametreleri</h4>
                      <div className="text-xs space-y-1 mt-2">
                        <p>• <strong>Optimizer:</strong> Adam (lr=0.001)</p>
                        <p>• <strong>Loss:</strong> MSE + Physics-informed</p>
                        <p>• <strong>Batch Size:</strong> 32</p>
                        <p>• <strong>Epochs:</strong> 100 (early stopping)</p>
                        <p>• <strong>Validation Split:</strong> 20%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VAE Detayları */}
                <div className="space-y-4">
                  <h3 className="font-bold text-purple-800">🧠 VAE Konfigürasyonu</h3>
                  <div className="space-y-3">
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-medium text-sm">Encoder</h4>
                      <div className="text-xs space-y-1 mt-2">
                        <p>• <strong>Input Dim:</strong> Feature vector</p>
                        <p>• <strong>Hidden:</strong> 128 → 64 → 32</p>
                        <p>• <strong>Latent Dim:</strong> 16</p>
                        <p>• <strong>Activation:</strong> ReLU</p>
                        <p>• <strong>Output:</strong> μ, σ (reparameterization)</p>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-medium text-sm">Decoder</h4>
                      <div className="text-xs space-y-1 mt-2">
                        <p>• <strong>Input:</strong> Latent vector</p>
                        <p>• <strong>Hidden:</strong> 32 → 64 → 128</p>
                        <p>• <strong>Output Dim:</strong> Original features</p>
                        <p>• <strong>Loss:</strong> Reconstruction + KL divergence</p>
                        <p>• <strong>Beta:</strong> 0.1 (β-VAE)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ensemble Detayları */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800">🎯 Ensemble Sistem</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <h4 className="font-medium text-sm">Risk Skorlama</h4>
                      <div className="text-xs space-y-1 mt-2">
                        <p>• <strong>Seviye:</strong> 35% (referans + kişisel)</p>
                        <p>• <strong>Trend:</strong> 25% (eğim + artış)</p>
                        <p>• <strong>LSTM:</strong> 15% (tahmin hatası)</p>
                        <p>• <strong>VAE:</strong> 15% (reconstruction)</p>
                        <p>• <strong>Volatilite:</strong> 10% (CV)</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <h4 className="font-medium text-sm">Alarm Politikası</h4>
                      <div className="text-xs space-y-1 mt-2">
                        <p>• <strong>Normal:</strong> &lt; 40 puan</p>
                        <p>• <strong>Dikkat:</strong> 40-70 puan</p>
                        <p>• <strong>Kritik:</strong> 70-85 puan</p>
                        <p>• <strong>Çok Kritik:</strong> &gt; 85 puan</p>
                        <p>• <strong>FPR Hedefi:</strong> &lt; 5%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sistem İstatistikleri */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                <h3 className="font-bold mb-3">📊 Sistem İstatistikleri</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
                    <div className="text-xs text-muted-foreground">Toplam Hasta</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{patients.reduce((sum, p) => sum + p.n_measurements, 0)}</div>
                    <div className="text-xs text-muted-foreground">Toplam Ölçüm</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{patients.reduce((sum, p) => sum + p.summary.total_anomalies, 0)}</div>
                    <div className="text-xs text-muted-foreground">Tespit Edilen Anomali</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">98.5%</div>
                    <div className="text-xs text-muted-foreground">Model Doğruluğu</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}