"use client";

import { useState } from "react";
import { useDashboardData, riskColors } from "@/hooks/useKimerizmData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Search, Filter, TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";

export default function PatientsPage() {
  const { patients, isLoading, error } = useDashboardData();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("risk_desc");

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
          <p className="mt-2 text-sm text-muted-foreground">Hasta verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Filtreleme ve sıralama
  let filteredPatients = [...patients];
  
  // Arama filtresi
  if (searchTerm) {
    filteredPatients = filteredPatients.filter(p => 
      p.patient_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Risk filtresi
  if (riskFilter !== "all") {
    filteredPatients = filteredPatients.filter(p => p.risk_level === riskFilter);
  }
  
  // Sıralama
  filteredPatients.sort((a, b) => {
    switch (sortBy) {
      case "risk_desc":
        return b.risk_score - a.risk_score;
      case "risk_asc":
        return a.risk_score - b.risk_score;
      case "patient_asc":
        return a.patient_code.localeCompare(b.patient_code);
      case "patient_desc":
        return b.patient_code.localeCompare(a.patient_code);
      case "chr_desc":
        return b.latest_chr - a.latest_chr;
      case "chr_asc":
        return a.latest_chr - b.latest_chr;
      case "anomaly_desc":
        return b.summary.total_anomalies - a.summary.total_anomalies;
      default:
        return 0;
    }
  });

  // Risk seviyesi istatistikleri
  const riskStats = {
    'Normal': patients.filter(p => p.risk_level === 'Normal').length,
    'Dikkat': patients.filter(p => p.risk_level === 'Dikkat').length,
    'Kritik': patients.filter(p => p.risk_level === 'Kritik').length,
    'Çok Kritik': patients.filter(p => p.risk_level === 'Çok Kritik').length,
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hasta Listesi</h1>
        <p className="text-muted-foreground">
          Tüm hastaların detaylı risk analizi ve takibi
        </p>
      </div>

      {/* Risk İstatistikleri */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(riskStats).map(([level, count]) => (
          <Card key={level}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{level}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: riskColors[level as keyof typeof riskColors] }}>
                {count}
              </div>
              <p className="text-xs text-muted-foreground">
                %{((count / patients.length) * 100).toFixed(1)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtreler */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler ve Arama</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Arama */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hasta kodu ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Risk Filtresi */}
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Risk seviyesi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Seviyeler</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Dikkat">Dikkat</SelectItem>
                <SelectItem value="Kritik">Kritik</SelectItem>
                <SelectItem value="Çok Kritik">Çok Kritik</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sıralama */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sıralama" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk_desc">Risk (Yüksek → Düşük)</SelectItem>
                <SelectItem value="risk_asc">Risk (Düşük → Yüksek)</SelectItem>
                <SelectItem value="patient_asc">Hasta Kodu (A → Z)</SelectItem>
                <SelectItem value="patient_desc">Hasta Kodu (Z → A)</SelectItem>
                <SelectItem value="chr_desc">Kimerizm (Yüksek → Düşük)</SelectItem>
                <SelectItem value="chr_asc">Kimerizm (Düşük → Yüksek)</SelectItem>
                <SelectItem value="anomaly_desc">Anomali (Çok → Az)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Hasta Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle>Hasta Verileri</CardTitle>
          <CardDescription>
            {filteredPatients.length} hasta gösteriliyor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th scope="col" className="px-6 py-3">Hasta Kodu</th>
                  <th scope="col" className="px-6 py-3">Risk Skoru</th>
                  <th scope="col" className="px-6 py-3">Risk Seviyesi</th>
                  <th scope="col" className="px-6 py-3">Son Kimerizm</th>
                  <th scope="col" className="px-6 py-3">Trend</th>
                  <th scope="col" className="px-6 py-3">Anomali</th>
                  <th scope="col" className="px-6 py-3">Ölçüm</th>
                  <th scope="col" className="px-6 py-3">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.patient_code} className="bg-white border-b hover:bg-muted/50">
                    <th scope="row" className="px-6 py-4 font-medium">
                      {patient.patient_code}
                    </th>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${patient.risk_score}%`,
                              backgroundColor: patient.risk_color 
                            }}
                          />
                        </div>
                        <span className="ml-2 text-sm">{patient.risk_score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: patient.risk_color }}
                      >
                        {patient.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {patient.latest_chr.toFixed(3)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {patient.summary.trend_direction === 'increasing' ? (
                          <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                        ) : patient.summary.trend_direction === 'decreasing' ? (
                          <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <Activity className="h-4 w-4 text-blue-500 mr-1" />
                        )}
                        <span className="text-xs">
                          {patient.summary.trend_direction === 'increasing' ? 'Yükseliş' :
                           patient.summary.trend_direction === 'decreasing' ? 'Düşüş' : 'Sabit'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {patient.summary.total_anomalies > 0 ? (
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                          <span>{patient.summary.total_anomalies}</span>
                        </div>
                      ) : (
                        <span className="text-green-500">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {patient.n_measurements}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/patients/${patient.patient_code}`}>
                        <Button variant="outline" size="sm">
                          Detay →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredPatients.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm || riskFilter !== "all" 
                    ? "Filtrelere uygun hasta bulunamadı." 
                    : "Henüz hasta verisi yok."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
