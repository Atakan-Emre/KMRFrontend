"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { usePatientDetail, useChannelOverview } from "@/hooks/useKimerizmData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import dynamic from "next/dynamic";
import { ArrowLeft, Eye, EyeOff, Download, AlertTriangle, Maximize2, Minimize2, Plus, Minus, RotateCcw, Settings, X } from "lucide-react";
import Link from "next/link";

// Plotly'i client-side only olarak yükle
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Renk paleti - kanal adına göre deterministik
const getChannelColor = (channel: string) => {
  const colors = [
    '#e11d48', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#eab308', '#ef4444', '#3b82f6', '#22c55e',
    '#a855f7', '#f43f5e', '#0891b2', '#65a30d', '#dc2626'
  ];
  
  // Hash fonksiyonu
  let hash = 0;
  for (let i = 0; i < channel.length; i++) {
    const char = channel.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Tip tanımlamaları
interface TimelinePoint {
  date_code: number;
  phase: string;
  phase_code: number;
  phase_index: number;
  channel: string;
  value: number;
  flags: {
    ref_outlier: boolean;
    personal_high_warn: boolean;
    personal_high_crit: boolean;
    clinical_high: boolean;
    trend_up: boolean;
  };
  originalIndex?: number; // Sıralama için orijinal indeks
  timeIndex?: number; // Faz içindeki zaman sırası
}

interface PhaseWidth {
  start: number;
  end: number;
  width: number;
  center: number;
  sequence: number[];
}

interface DataCoverage {
  phase: string;
  phase_code: number;
  phase_index: number;
  available_channels: string[];
  channel_count: number;
}

// PatientData interface (kullanılıyor - TypeScript tip kontrolü için gerekli)

interface PlotlyTrace {
  x: (string | number)[];
  y: number[];
  type?: string;
  mode?: string;
  name: string;
  line?: Record<string, unknown>;
  marker?: Record<string, unknown>;
  text?: string[];
  hovertemplate?: string;
  fill?: string;
  fillcolor?: string;
  showlegend?: boolean;
  hoverinfo?: string;
  [key: string]: unknown; // Index signature for compatibility
}

export default function MultiChannelPatientPage() {
  const params = useParams();
  const patientId = params.id as string;
  
  const { data: patient, isLoading: patientLoading, error: patientError } = usePatientDetail(patientId);
  const { isLoading: channelLoading, error: channelError } = useChannelOverview();
  
  // Kanal görünürlük durumu
  const [visibleChannels, setVisibleChannels] = useState<Set<string>>(new Set());
  
  // Grafik boyutu durumu
  const [chartHeight, setChartHeight] = useState(600);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Panel boyutu durumu (resizable)
  const [panelWidth, setPanelWidth] = useState(384); // 384px = w-96
  const [isResizing, setIsResizing] = useState(false);
  
  // Tam ekran modunda grafik ayarları açık/kapalı
  const [showFullscreenSettings, setShowFullscreenSettings] = useState(false);
  
  // Çizgi görünürlük durumu
  const [showPersonalThresholds, setShowPersonalThresholds] = useState(false);
  const [showPersonalTrend, setShowPersonalTrend] = useState(false);
  const [showPersonalAverage, setShowPersonalAverage] = useState(false);
  const [showGeneralTrend, setShowGeneralTrend] = useState(false);

  // Detaylı analiz paneli collapsible durumları
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);
  const [showCriticalityAnalysis, setShowCriticalityAnalysis] = useState(false);

  // Bilgi kutusu: tıklama ile pin - spesifik zaman noktası için
  type PinnedInfo = {
    phase: number;
    channel: string;
    value: number;
    localIdx: number;
    timeIndex: number; // Aynı fazda hangi zaman indeksi
  } | null;
  const [pinnedInfo, setPinnedInfo] = useState<PinnedInfo>(null);
  
  // Zaman serisi verilerini kanal bazında grupla ve zaman indeksi oluştur
  const timelineByChannel = useMemo(() => {
    if (!patient?.timeline) return {};

    const channelData: Record<string, TimelinePoint[]> = {};
    
    // Verileri kanallara göre grupla
    patient.timeline.forEach((point: TimelinePoint, originalIndex: number) => {
      if (!channelData[point.channel]) {
        channelData[point.channel] = [];
      }
      
      channelData[point.channel].push({ 
        ...point, 
        originalIndex,
        timeIndex: point.phase_index // Faz içindeki zaman sırası artık JSON'da geliyor
      });
    });

    // Her kanal için kronolojik sıralama yap
    Object.keys(channelData).forEach(channel => {
      channelData[channel].sort((a, b) => {
        // Önce phase_code'a göre (0,1,2,3)
        if (a.phase_code !== b.phase_code) {
          return a.phase_code - b.phase_code;
        }
        // Aynı fazda ise phase_index'e göre
        return a.phase_index - b.phase_index;
      });
    });

    return channelData;
  }, [patient?.timeline]);

  // Y ekseni aralığı: görünür kanalların verilerine göre dinamik
  const globalYAxisRange = useMemo(() => {
    if (!patient) return [0.001, 10];

    const dataValues: number[] = [];
    const channels = Array.from(visibleChannels);
    if (channels.length === 0) return [0.001, 10];

    channels.forEach((ch) => {
      const pts = (timelineByChannel[ch] || []);
      pts.forEach((p) => dataValues.push(p.value));
    });

    if (showPersonalThresholds) {
      if (patient.personal.post48_median) dataValues.push(patient.personal.post48_median);
      if (patient.personal.warn_threshold) dataValues.push(patient.personal.warn_threshold);
      if (patient.personal.crit_threshold) dataValues.push(patient.personal.crit_threshold);
    }

    if (dataValues.length === 0) return [0.001, 10];

    const minVal = Math.min(...dataValues);
    const maxVal = Math.max(...dataValues);
    const padding = Math.max(0.001, (maxVal - minVal) * 0.15);
    
    // Minimum değer için daha güvenli sınır - 0 değerler grafik dışına çıkmasın
    let yMin = Math.max(0.0001, minVal - padding);
    
    // Eğer minimum değer çok düşükse (0.001'den küçük), daha güvenli bir sınır belirle
    if (yMin < 0.001) {
      yMin = 0.001;
    }
    
    // Eğer tüm değerler 0'a çok yakınsa, minimum değeri biraz yukarı çek
    if (maxVal < 0.01) {
      yMin = 0.0005;
    }
    
    const yMax = maxVal + padding;

    return [yMin, yMax];
  }, [patient, visibleChannels, timelineByChannel, showPersonalThresholds]);

  // Phase'lerdeki veri sayılarını hesapla
  const phaseDataCounts = useMemo(() => {
    
    if (!patient?.data_coverage) return { 0: 1, 1: 1, 2: 1, 3: 1 };
    
    const counts: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };
    Object.values(patient.data_coverage).forEach((coverage: unknown) => {
      const typedCoverage = coverage as DataCoverage;
      counts[typedCoverage.phase_code]++;
    });
    
    // En az 1 olsun, sıfır olmasın
    Object.keys(counts).forEach(phase => {
      const phaseNum = parseInt(phase);
      counts[phaseNum] = Math.max(counts[phaseNum], 1);
    });
    
    return counts;
  }, [patient?.data_coverage]);

  // Phase içindeki sıralı date_code'ları hesapla
  const phaseSequences = useMemo(() => {
    if (!patient?.data_coverage) return { 0: [], 1: [], 2: [], 3: [] };
    
    const sequences: { [key: number]: number[] } = { 0: [], 1: [], 2: [], 3: [] };
    
    // Her phase için date_code'ları topla ve sırala
    Object.keys(patient.data_coverage).forEach(dateCode => {
      const coverage = patient.data_coverage[dateCode];
      sequences[coverage.phase_code].push(parseFloat(dateCode));
    });
    
    // Her phase'i kendi içinde sırala
    Object.keys(sequences).forEach(phase => {
      const phaseNum = parseInt(phase);
      sequences[phaseNum].sort((a: number, b: number) => a - b);
    });
    
    return sequences;
  }, [patient?.data_coverage]);

  // Phase genişlik oranlarını hesapla - Bitişik phase'ler
  const phaseWidths = useMemo(() => {
    const totalCount = Object.values(phaseDataCounts).reduce((sum, count) => sum + count, 0);
    const widths: { [key: number]: PhaseWidth } = {};
    
    let currentOffset = 0;
    
    for (let phase = 0; phase <= 3; phase++) {
      const ratio = phaseDataCounts[phase] / totalCount;
      const width = ratio * 4; // Toplam 4 birim
      
      widths[phase] = {
        start: currentOffset,
        end: currentOffset + width,
        width: width,
        center: currentOffset + (width / 2),
        sequence: phaseSequences[phase] // Sıralı date_code'lar
      };
      
      currentOffset += width;
    }
    
    return widths;
  }, [phaseDataCounts, phaseSequences]);

  // X ekseni konumlandırma fonksiyonu - Phase'ler arası çakışma önleme + bitişik geçiş
  const calculateXPosition = useCallback((date_code: number): number => {
    const phase_code = Math.floor(date_code);
    const phaseInfo = phaseWidths[phase_code];
    if (!phaseInfo || !phaseInfo.sequence) return phase_code;
    
    // Bu date_code'un phase içindeki sıralı pozisyonunu bul
    const sequenceIndex = phaseInfo.sequence.indexOf(date_code);
    if (sequenceIndex === -1) return phaseInfo.start;
    
    const totalPointsInPhase = phaseInfo.sequence.length;
    
    if (totalPointsInPhase === 1) {
      // Tek nokta varsa phase merkezine yerleştir
      return phaseInfo.center;
    } else {
      // Phase içinde veri noktaları arası minimum mesafe: 0.05 birim
      const minPointDistance = 0.05;
      const requiredWidth = (totalPointsInPhase - 1) * minPointDistance;
      
      let xPosition: number;
      if (requiredWidth <= phaseInfo.width) {
        // Normal eşit dağıtım - phase genişliğini kullan
        const intervalSize = phaseInfo.width / (totalPointsInPhase - 1);
        xPosition = phaseInfo.start + (sequenceIndex * intervalSize);
      } else {
        // Sıkışık durum: minimum mesafe ile dağıt
        xPosition = phaseInfo.start + (sequenceIndex * minPointDistance);
      }
      
      // Phase geçişlerinde çakışma önleme
      if (phase_code > 0) {
        const prevPhaseInfo = phaseWidths[phase_code - 1];
        if (prevPhaseInfo && prevPhaseInfo.sequence && prevPhaseInfo.sequence.length > 0) {
          // Önceki phase'in son noktasının pozisyonunu hesapla
          const lastPrevDateCode = Math.max(...prevPhaseInfo.sequence);
          
          // Recursive call yerine manuel hesaplama
          const lastPrevSequenceIndex = prevPhaseInfo.sequence.indexOf(lastPrevDateCode);
          let lastPrevPosition: number;
          
          if (prevPhaseInfo.sequence.length === 1) {
            lastPrevPosition = prevPhaseInfo.center;
          } else {
            const minPointDistance = 0.05;
            const requiredWidth = (prevPhaseInfo.sequence.length - 1) * minPointDistance;
            
            if (requiredWidth <= prevPhaseInfo.width) {
              const intervalSize = prevPhaseInfo.width / (prevPhaseInfo.sequence.length - 1);
              lastPrevPosition = prevPhaseInfo.start + (lastPrevSequenceIndex * intervalSize);
            } else {
              lastPrevPosition = prevPhaseInfo.start + (lastPrevSequenceIndex * minPointDistance);
            }
          }
          
          // Minimum phase geçiş mesafesi: 0.08 birim
          const minPhaseGap = 0.08;
          if (xPosition <= lastPrevPosition + minPhaseGap) {
            xPosition = lastPrevPosition + minPhaseGap;
          }
        }
      }
      
      return xPosition;
    }
  }, [phaseWidths]);

  // İkincil X ekseni için etiketleri hazırla - Phase geçişlerinde çakışma önleme
  const secondaryAxisData = useMemo(() => {
    if (!patient?.data_coverage) return { tickvals: [], ticktext: [] };
    
    const phaseNames: { [key: number]: string } = {
      0: "0-48s",
      1: "Günlük", 
      2: "Haftalık",
      3: "Aylık"
    };
    
    const allDateCodes = Object.keys(patient.data_coverage)
      .map(parseFloat)
      .sort((a, b) => a - b);
    
    const tickvals: number[] = [];
    const ticktext: string[] = [];
    
    // Phase geçişlerinde minimum mesafe kontrolü
    let lastXPosition = -1;
    const minPhaseGap = 0.02; // Phase'ler arası minimum mesafe
    
    allDateCodes.forEach(dateCode => {
      const phase_code = Math.floor(dateCode);
      const coverage = patient.data_coverage[dateCode.toString()];
      
      if (coverage && phaseSequences[phase_code]) {
        const sequence = phaseSequences[phase_code];
        const indexInPhase = sequence.indexOf(dateCode) + 1; // 1-based index
        let xPosition = calculateXPosition(dateCode);
        
        // Phase geçişinde çakışma kontrolü
        if (lastXPosition >= 0 && xPosition <= lastXPosition + minPhaseGap) {
          xPosition = lastXPosition + minPhaseGap;
        }
        
        tickvals.push(xPosition);
        ticktext.push(`${phaseNames[phase_code]}_${indexInPhase}`);
        lastXPosition = xPosition;
      }
    });
    
    return { tickvals, ticktext };
  }, [patient?.data_coverage, phaseSequences, calculateXPosition]);



  // Plotly verilerini hazırla - Tamamen yeni yaklaşım
  const plotlyData = useMemo(() => {
    // Eğer hiç kanal seçili değilse boş array döndür
    if (!patient || visibleChannels.size === 0) {
      return [];
    }

    // TAMAMEM YENİ YAKLAŞIM: Tek bir trace'de hem normal hem anomali noktaları
    const traces: PlotlyTrace[] = [];
    
    // Her görünür kanal için iki trace: Normal noktalar + Anomali noktalar
    Array.from(visibleChannels).forEach((channel, channelIdx) => {
      const channelPoints = timelineByChannel[channel] || [];
      if (channelPoints.length === 0) return;
      
      const channelColor = getChannelColor(channel);
      const baseJitter = (channelIdx - (visibleChannels.size - 1) / 2) * 0.02;
      
      // 1. Normal noktalar için trace (ana trace - legend'da görünür)
      const normalPoints = channelPoints.filter(p => !Object.values(p.flags).some(Boolean));
      if (normalPoints.length > 0) {
        // Phase geçişlerinde çakışma önleme - önce basit hesaplama
        const normalXValues = normalPoints.map((p, i) => 
          calculateXPosition(p.date_code) + baseJitter + (i * 0.001)
        );
        
        // Sonra çakışma kontrolü uygula
        for (let i = 1; i < normalXValues.length; i++) {
          const minGap = 0.03; // Normal noktalar arası minimum mesafe
          if (normalXValues[i] <= normalXValues[i-1] + minGap) {
            normalXValues[i] = normalXValues[i-1] + minGap;
          }
        }
        
        traces.push({
          x: normalXValues,
          y: normalPoints.map(p => p.value),
          type: 'scatter',
          mode: 'markers',
          name: channel, // Legend'da görünecek
          legendgroup: channel,
          showlegend: true,
          marker: {
            color: channelColor, // Kanal rengi legend'da görünür
            size: 12,
            symbol: 'circle',
            line: { color: '#ffffff', width: 2 },
            opacity: 1.0
          },
          text: normalPoints.map(p => 
            `${channel}<br>Değer: ${p.value.toFixed(3)}<br>Faz: ${p.phase}<br>✅ Normal değer`
          ),
          hovertemplate: '%{text}<extra></extra>',
          customdata: normalPoints.map((p, i) => ({ 
            phase: p.phase_code, 
            channel, 
            value: p.value, 
            localIdx: i,
            timeIndex: p.phase_index
          })),
        });
      } else {
        // Normal nokta yoksa bile legend için dummy trace ekle
        traces.push({
          x: [0],
          y: [0],
          type: 'scatter',
          mode: 'markers',
          name: channel,
          legendgroup: channel,
          showlegend: true,
          visible: false, // Görünmez ama legend'da var
          marker: {
            color: channelColor,
            size: 12,
            symbol: 'circle'
          }
        });
      }
      
      // 2. Anomali noktalar için trace (legend'da gizli)
      const anomalyPoints = channelPoints.filter(p => Object.values(p.flags).some(Boolean));
      if (anomalyPoints.length > 0) {
        // Phase geçişlerinde çakışma önleme - önce basit hesaplama
        const anomalyXValues = anomalyPoints.map((p, i) => 
          calculateXPosition(p.date_code) + baseJitter + (i * 0.001) + 0.005
        );
        
        // Sonra çakışma kontrolü uygula
        for (let i = 1; i < anomalyXValues.length; i++) {
          const minGap = 0.03; // Anomali noktalar arası minimum mesafe
          if (anomalyXValues[i] <= anomalyXValues[i-1] + minGap) {
            anomalyXValues[i] = anomalyXValues[i-1] + minGap;
          }
        }
        
        traces.push({
          x: anomalyXValues,
          y: anomalyPoints.map(p => p.value),
          type: 'scatter',
          mode: 'markers',
          name: `${channel}_anomalies`, // Internal name
          legendgroup: channel,
          showlegend: false, // Legend'da görünmez
          marker: {
            color: anomalyPoints.map(p => {
              // Anomali renkleri
              if (p.flags.personal_high_crit) return '#ef4444';
              if (p.flags.clinical_high) return '#dc2626';  
              if (p.flags.personal_high_warn) return '#f97316';
              if (p.flags.ref_outlier) return '#eab308';
              return channelColor;
            }),
            size: anomalyPoints.map(p => {
              if (p.flags.personal_high_crit || p.flags.clinical_high) return 18;
              if (p.flags.personal_high_warn || p.flags.ref_outlier) return 16;
              return 14;
            }),
            symbol: anomalyPoints.map(p => {
              if (p.flags.personal_high_crit) return 'diamond';
              if (p.flags.clinical_high) return 'square';
              if (p.flags.personal_high_warn) return 'triangle-up';
              if (p.flags.ref_outlier) return 'star';
              return 'circle';
            }),
            line: { color: '#ffffff', width: 3 },
            opacity: 1.0
          },
          text: anomalyPoints.map(p => {
            let baseText = `${channel}<br>Değer: ${p.value.toFixed(3)}<br>Faz: ${p.phase}`;
            
            const anomalies = Object.entries(p.flags)
              .filter(([, flag]) => flag)
              .map(([key]) => {
                switch(key) {
                  case 'ref_outlier': return '⭐ Referans P97.5 üstü';
                  case 'personal_high_crit': return '💎 Kişisel +3MAD üstü';
                  case 'personal_high_warn': return '🔺 Kişisel +2MAD üstü';
                  case 'clinical_high': return '🟦 Klinik eşik üstü';
                  default: return key;
                }
              });
            baseText += '<br><br>🚨 ANOMALİ: ' + anomalies.join(', ');
            
            return baseText;
          }),
          hovertemplate: '%{text}<extra></extra>',
          customdata: anomalyPoints.map((p, i) => ({ 
            phase: p.phase_code, 
            channel, 
            value: p.value, 
            localIdx: i,
            timeIndex: p.phase_index
          })),
        });
      }
    });
    
        // Kişisel Trend ve Ortalama Çizgileri - Ayrı ayrı kontrol
    if ((showPersonalTrend || showPersonalAverage) && visibleChannels.size > 0 && patient.timeline.length > 0) {
      // Görünür kanalların her phase_code için ortalama değerlerini hesapla
      const personalPhaseAverages: Record<number, number[]> = {};
      
      // Sadece görünür kanalları kullan
      Array.from(visibleChannels).forEach(channel => {
        const channelPoints = timelineByChannel[channel] || [];
        channelPoints.forEach(point => {
          if (!personalPhaseAverages[point.phase_code]) {
            personalPhaseAverages[point.phase_code] = [];
          }
          personalPhaseAverages[point.phase_code].push(point.value);
        });
      });
      
      // Her phase_code için ortalama hesapla
      const personalAvgPoints = Object.keys(personalPhaseAverages)
        .map(Number)
        .sort((a, b) => a - b)
        .map(phase_code => ({
          x: phaseWidths[phase_code]?.center || phase_code + 0.5, // Dinamik phase merkezleri
          y: personalPhaseAverages[phase_code].reduce((sum, val) => sum + val, 0) / personalPhaseAverages[phase_code].length
        }));
      
      if (personalAvgPoints.length >= 2) {
        // Kişisel ortalama trend için linear regression
        const n = personalAvgPoints.length;
        const xMean = personalAvgPoints.reduce((sum, p) => sum + p.x, 0) / n;
        const yMean = personalAvgPoints.reduce((sum, p) => sum + p.y, 0) / n;
        
        const numerator = personalAvgPoints.reduce((sum, p) => sum + (p.x - xMean) * (p.y - yMean), 0);
        const denominator = personalAvgPoints.reduce((sum, p) => sum + Math.pow(p.x - xMean, 2), 0);
        
        if (denominator !== 0) {
          const slope = numerator / denominator;
          const intercept = yMean - slope * xMean;
          
          // Kişisel trend çizgisi (sadece açıksa)
          if (showPersonalTrend) {
            const personalTrendX = Object.values(phaseWidths).map((p: PhaseWidth) => p.center); // Dinamik phase merkezleri
            const personalTrendY = personalTrendX.map(x => slope * x + intercept);
            traces.push({
              x: personalTrendX,
              y: personalTrendY,
              type: 'scatter',
              mode: 'lines',
              name: '📈 Kişisel Trend',
              showlegend: true,
              line: { 
                color: '#6366f1', 
                width: 4,
                dash: 'dashdot',
                opacity: 0.9
              },
              hovertemplate: `Kişisel Trend: %{y:.3f}%<br>Eğim: ${slope > 0 ? '+' : ''}${slope.toFixed(4)}/faz<extra></extra>`
            });
          }
          
          // Kişisel ortalama çizgisi (sadece açıksa)
          if (showPersonalAverage) {
            const personalTrendX = Object.values(phaseWidths).map((p: PhaseWidth) => p.center); // Dinamik phase merkezleri
            traces.push({
              x: personalTrendX,
              y: Array(personalTrendX.length).fill(yMean),
              type: 'scatter',
              mode: 'lines',
              name: '📊 Kişisel Ortalama',
              showlegend: true,
              line: { 
                color: '#8b5cf6', 
                width: 3,
                dash: 'longdash',
                opacity: 0.8
              },
              hovertemplate: `Kişisel Ortalama: %{y:.3f}%<br>Görünür kanallar ortalaması<extra></extra>`
            });
          }
        }
      }
    }
    
    // Genel ortalama trend çizgisi (koşullu) - TÜM HASTA VERİLERİNE DAYALI
    if (showGeneralTrend && visibleChannels.size > 0 && patient.timeline.length > 0) {
      // TÜM kanalların phase_code bazında ortalama değerlerini hesapla
      const phaseAverages: Record<number, number[]> = {};
      
      // Tüm hasta timeline verilerini kullan
      patient.timeline.forEach((point: TimelinePoint) => {
        if (!phaseAverages[point.phase_code]) {
          phaseAverages[point.phase_code] = [];
        }
        phaseAverages[point.phase_code].push(point.value);
      });
      
      // Her phase_code için ortalama hesapla
      const avgTrendPoints = Object.keys(phaseAverages)
        .map(Number)
        .sort((a, b) => a - b)
        .map(phase_code => ({
          x: phaseWidths[phase_code]?.center || phase_code + 0.5, // Dinamik phase merkezleri
          y: phaseAverages[phase_code].reduce((sum, val) => sum + val, 0) / phaseAverages[phase_code].length
        }));
      
      if (avgTrendPoints.length >= 2) {
        // Genel ortalama trend çizgisi
        traces.push({
          x: avgTrendPoints.map(p => p.x),
          y: avgTrendPoints.map(p => p.y),
          type: 'scatter',
          mode: 'lines+markers',
          name: '📊 Tüm Kanal Ortalaması',
          showlegend: true,
          line: { 
            color: '#8b5cf6', 
            width: 4,
            dash: 'solid'
          },
          marker: {
            size: 12,
            color: '#8b5cf6',
            symbol: 'diamond'
          },
          hovertemplate: 'Tüm Kanal Ortalaması: %{y:.3f}%<br>Faz: %{x}<extra></extra>'
        });
        
        // Genel trend için linear regression
        const n = avgTrendPoints.length;
        const xMean = avgTrendPoints.reduce((sum, p) => sum + p.x, 0) / n;
        const yMean = avgTrendPoints.reduce((sum, p) => sum + p.y, 0) / n;
        
        const numerator = avgTrendPoints.reduce((sum, p) => sum + (p.x - xMean) * (p.y - yMean), 0);
        const denominator = avgTrendPoints.reduce((sum, p) => sum + Math.pow(p.x - xMean, 2), 0);
        
        if (denominator !== 0) {
          const slope = numerator / denominator;
          const intercept = yMean - slope * xMean;
          // Yalnızca pozitif (yükselen) genel trend çiz
          if (slope > 0) {
            const generalTrendX = Object.values(phaseWidths).map((p: PhaseWidth) => p.center); // Dinamik phase merkezleri
            const generalTrendY = generalTrendX.map(x => slope * x + intercept);
            traces.push({
              x: generalTrendX,
              y: generalTrendY,
              type: 'scatter',
              mode: 'lines',
              name: '📈 Tüm Kanal Trend',
              showlegend: true,
              line: { 
                color: '#8b5cf6', 
                width: 5,
                dash: 'longdash',
                opacity: 0.8
              },
              hovertemplate: `Tüm Kanal Trend: %{y:.3f}%<br>Eğim: +${slope.toFixed(4)}<extra></extra>`
            });
          }
        }
      }
    }
    
    // Referans bandı devre dışı
    
        // Dinamik kişisel eşikler - sürekli çizgi için
    if (showPersonalThresholds && patient.personal.warn_threshold) {
      // Eşik çizgileri tüm dinamik aralığı kapsasın
      const thresholdXPositions: number[] = [];
      const maxX = Math.max(...Object.values(phaseWidths).map((p: PhaseWidth) => p.end));
      for (let x = 0; x <= maxX; x += 0.05) {
        thresholdXPositions.push(x);
      }
      

      traces.push({
        x: thresholdXPositions,
        y: Array(thresholdXPositions.length).fill(patient.personal.warn_threshold),
        type: 'scatter',
        mode: 'lines',
        name: 'Kişisel +2MAD',
        showlegend: true,
        line: { color: '#f59e0b', dash: 'dash', width: 2 },
        hovertemplate: 'Kişisel Uyarı: %{y:.3f}%<extra></extra>'
      });
      
      if (patient.personal.crit_threshold) {
        traces.push({
          x: thresholdXPositions,
          y: Array(thresholdXPositions.length).fill(patient.personal.crit_threshold),
          type: 'scatter',
          mode: 'lines',
          name: 'Kişisel +3MAD',
          showlegend: true,
          line: { color: '#ef4444', dash: 'dash', width: 2 },
          hovertemplate: 'Kişisel Kritik: %{y:.3f}%<extra></extra>'
        });
      }
    }
    
    return traces;
  }, [visibleChannels, timelineByChannel, patient, showPersonalThresholds, showPersonalTrend, showPersonalAverage, showGeneralTrend, calculateXPosition, phaseWidths]);

  // Hasta verisi yüklendiğinde varsayılan kanalları aç
  useEffect(() => {
    if (patient?.default_on && patient.default_on.length > 0) {
      setVisibleChannels(new Set(patient.default_on));
    }
  }, [patient?.default_on]);

  // Force channel selection if empty after patient loads
  useEffect(() => {
    if (patient?.channels && visibleChannels.size === 0) {
      setVisibleChannels(new Set([patient.channels[0]]));
    }
  }, [patient?.channels, visibleChannels.size]);

  // Panel resize hook'ları
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 320; // Minimum panel genişliği
    const maxWidth = window.innerWidth * 0.7; // Maksimum %70
    
    setPanelWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
  }, [isResizing]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  // Mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Panel resize fonksiyonu
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  if (patientLoading || channelLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Hasta verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (patientError || channelError) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold mb-2 text-red-600">Veri Yükleme Hatası</h2>
        <p className="text-muted-foreground mb-4">
          {patientError?.message || channelError?.message || 'Bilinmeyen hata'}
        </p>
        <Link href="/patients">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Hasta listesine dön
          </Button>
        </Link>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold mb-2">Hasta bulunamadı</h2>
        <p className="text-muted-foreground mb-4">Hasta kodu: {patientId}</p>
        <Link href="/patients">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Hasta listesine dön
          </Button>
        </Link>
      </div>
    );
  }



  // Kanal seçimi fonksiyonları
  const toggleChannel = (channel: string) => {
    const newVisible = new Set(visibleChannels);
    if (newVisible.has(channel)) {
      newVisible.delete(channel);
    } else {
      newVisible.add(channel);
    }
    setVisibleChannels(newVisible);
  };

  const toggleAllChannels = () => {
    if (visibleChannels.size === patient.channels.length) {
      setVisibleChannels(new Set());
    } else {
      setVisibleChannels(new Set(patient.channels));
    }
  };

  const showOnlyChannel = (channel: string) => {
    setVisibleChannels(new Set([channel]));
  };

  // Kanal grubu seçim fonksiyonları
  const selectHighValueChannels = () => {
    if (!patient) return;
    const highValueChannels = patient.channels.filter((channel: string) => {
      const channelPoints = timelineByChannel[channel] || [];
      const avgValue = channelPoints.reduce((sum, p) => sum + p.value, 0) / channelPoints.length;
      return avgValue > 1.0; // 1% üstü değerler
    });
    setVisibleChannels(new Set(highValueChannels.slice(0, 5))); // En fazla 5 kanal
  };

  const selectAnomalyChannels = () => {
    if (!patient) return;
    const anomalyChannels = patient.channels.filter((channel: string) => {
      const channelPoints = timelineByChannel[channel] || [];
      return channelPoints.some(p => Object.values(p.flags).some(Boolean));
    });
    setVisibleChannels(new Set(anomalyChannels));
  };

  const selectTrendingChannels = () => {
    if (!patient) return;
    const trendingChannels = patient.channels.filter((channel: string) => {
      const channelPoints = timelineByChannel[channel] || [];
      return channelPoints.some(p => p.flags.trend_up);
    });
    setVisibleChannels(new Set(trendingChannels));
  };

  // Risk değişkenleri kaldırıldı

  const exportPNG = () => {
    // Plot PNG export (Plotly otomatik)
    const plotElement = document.querySelector('.js-plotly-plot') as HTMLElement & {
      downloadImage?: (options: {format: string, width: number, height: number, filename: string}) => void;
    };
    if (plotElement && plotElement.downloadImage) {
      plotElement.downloadImage({
        format: 'png',
        width: 1200,
        height: chartHeight,
        filename: `${patient.meta.patient_code}_timeline`
      });
    }
  };

  // Grafik boyutunu ayarlama fonksiyonları
  const increaseHeight = () => setChartHeight(prev => Math.min(prev + 100, 1200));
  const decreaseHeight = () => setChartHeight(prev => Math.max(prev - 100, 400));
  const resetHeight = () => setChartHeight(600);
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setChartHeight(window.innerHeight - 200);
    } else {
      setChartHeight(600);
    }
  };

  // Panel resize fonksiyonları taşındı - hook'lar üstte

  return (
    <div className="space-y-6">
      {/* Başlık ve geri butonu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/patients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Hasta {patient.meta.patient_code}</h1>
            <p className="text-muted-foreground">
              {patient.meta.n_channels} kanal • {patient.meta.n_measurements} ölçüm
            </p>
          </div>
        </div>
      </div>



      {/* Ana Grafikler */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Çok Kanallı Zaman Serisi</TabsTrigger>
          <TabsTrigger value="anomalies">Anomali Detayları</TabsTrigger>
          <TabsTrigger value="stats">Kanal İstatistikleri</TabsTrigger>
          <TabsTrigger value="details">Hasta Bilgileri</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                  <CardTitle>Çok Kanallı Kimerizm Zaman Serisi</CardTitle>
              <CardDescription>
                    {visibleChannels.size} kanal görüntüleniyor • Kişisel eşikler ve trend çizgileri tercihe bağlı
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {/* Grafik boyut kontrolleri */}
              <div className="flex items-center space-x-1 border rounded-md">
                <Button variant="ghost" size="sm" onClick={decreaseHeight} title="Yüksekliği azalt">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs text-muted-foreground">{chartHeight}px</span>
                <Button variant="ghost" size="sm" onClick={increaseHeight} title="Yüksekliği artır">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={resetHeight} title="Varsayılan boyut">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleFullscreen}
                      className="text-xs font-medium"
                      title="Detaylı analiz için tam ekran modu"
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="mr-1 h-4 w-4" />
                          Normal Görünüm
                        </>
                      ) : (
                        <>
                          <Maximize2 className="mr-1 h-4 w-4" />
                          Detaylı Analiz
                        </>
                      )}
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={exportPNG}>
                <Download className="mr-2 h-4 w-4" />
                PNG İndir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden">
                            {/* Ana Layout - Normal modda sağ panel, tam ekranda da sağ panel */}
              <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : 'flex flex-col lg:flex-row gap-4 w-full'}`}
                style={{ 
                  height: isFullscreen ? '100vh' : 'auto',
                  width: isFullscreen ? '100vw' : '100%',
                  overflow: isFullscreen ? 'hidden' : 'visible',
                  maxWidth: '100%'
                }}
              >
                {/* Tam ekran başlık */}
                {isFullscreen && (
                  <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        🧬 Detaylı Kimerizm Analiz Modu
                      </h2>
                      <p className="text-sm text-gray-600">
                        Hasta {patient.meta.patient_code} - İnteraktif Grafik + Detaylı Analiz Paneli
                      </p>
                                        </div>
                    <div className="flex gap-2">
            <Button 
                        variant={showFullscreenSettings ? "default" : "outline"} 
              size="sm" 
                        onClick={() => setShowFullscreenSettings(!showFullscreenSettings)}
                        className="text-xs font-medium"
                        title="Grafik ayarları panelini aç/kapat"
                      >
                        {showFullscreenSettings ? (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Ayarları Kapat
                          </>
                        ) : (
                          <>
                            <Settings className="mr-2 h-4 w-4" />
                            Grafik Ayarları
                          </>
                        )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
                        onClick={toggleFullscreen}
                        className="text-xs font-medium"
            >
                        <Minimize2 className="mr-2 h-4 w-4" />
                        Normal Görünüme Dön
            </Button>
              </div>
            </div>
          )}

                {/* Ana İçerik Alanı - Sol grafik, sağ panel */}
                <div className={`flex gap-4 ${isFullscreen ? 'flex-1 min-h-0' : 'flex-col lg:flex-row w-full'}`}>
                  {/* Sol Taraf - Grafik Alanı */}
                  <div className={`${isFullscreen ? 'flex-1 min-h-0' : 'w-full lg:flex-1 lg:min-w-0 overflow-hidden'}`}>
              {visibleChannels.size === 0 ? (
                <div 
                  className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg"
                      style={{ height: isFullscreen ? 'calc(100vh - 200px)' : `${chartHeight}px` }}
                >
                  <div className="text-center">
                    <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Kanal seçin</p>
                    <p className="text-sm text-muted-foreground">
                          Sağ panelden en az bir kanal seçerek başlayın
                    </p>
                  </div>
                </div>
              ) : (
                    <div className="w-full h-full overflow-hidden">
                      {/* Ana grafik */}
                        <Plot
                          key={`plot-${Array.from(visibleChannels).sort().join('-')}`}
                          data={plotlyData}
                          layout={{
                            xaxis: { 
                              title: {
                                text: 'ZAMAN FAZLARI',
                                font: { size: 12 }
                              },
                              type: 'linear',
                              tickmode: 'array',
                              tickvals: Object.values(phaseWidths).map((p: PhaseWidth) => p.center), // Dinamik phase merkezleri
                              ticktext: ['0–48 Saat<br>İlk 2 Gün', 'Günlük<br>İzlem', 'Haftalık<br>Kontrol', 'Aylık<br>Takip'],
                              range: [-0.1, Math.max(...Object.values(phaseWidths).map((p: PhaseWidth) => p.end)) + 0.1],
                              showgrid: true,
                              gridcolor: 'rgba(128,128,128,0.2)',
                              automargin: true,
                              fixedrange: false,
                              side: 'bottom',
                              // X ekseni zoom durumunu koru
                              constrain: 'domain'
                            },
                            xaxis2: { // İkincil X ekseni - zaman sıralaması için
                              type: 'linear',
                              tickmode: 'array',
                              tickvals: secondaryAxisData.tickvals,
                              ticktext: secondaryAxisData.ticktext,
                              range: [-0.1, Math.max(...Object.values(phaseWidths).map((p: PhaseWidth) => p.end)) + 0.1],
                              overlaying: 'x',
                              side: 'top',
                              showgrid: false,
                              // İkincil X ekseni zoom durumunu koru
                              constrain: 'domain',
                              tickfont: { size: 8, color: 'rgba(100,100,100,0.7)' },
                              tickangle: -45, // Etiketleri eğik yaz, çakışmasın
                              title: {
                                text: 'Zaman Sıralaması',
                                font: { size: 10, color: 'rgba(100,100,100,0.8)' }
                              }
                            },
                            shapes: [
                              // Dinamik arka plan bölgeleri
                              ...(() => {
                                const colors = [
                                  'rgba(255,182,193,0.1)', // Açık pembe - 0-48s
                                  'rgba(173,216,230,0.1)', // Açık mavi - Günlük
                                  'rgba(144,238,144,0.1)', // Açık yeşil - Haftalık
                                  'rgba(255,218,185,0.1)'  // Açık turuncu - Aylık
                                ];
                                const shapes = [];
                                
                                // Arka plan renkleri
                                for (let phase = 0; phase <= 3; phase++) {
                                  const phaseInfo = phaseWidths[phase];
                                  if (phaseInfo) {
                                    shapes.push({
                                      type: 'rect',
                                      xref: 'x',
                                      yref: 'paper',
                                      x0: phaseInfo.start,
                                      x1: phaseInfo.end,
                                      y0: 0, y1: 1,
                                      fillcolor: colors[phase],
                                      line: { width: 0 }
                                    });
                                  }
                                }
                                
                                // Phase ayırıcı çizgiler
                                for (let phase = 1; phase <= 3; phase++) {
                                  const phaseInfo = phaseWidths[phase];
                                  if (phaseInfo) {
                                    shapes.push({
                                      type: 'line',
                                      xref: 'x',
                                      yref: 'paper',
                                      x0: phaseInfo.start,
                                      x1: phaseInfo.start,
                                      y0: 0, y1: 1,
                                      line: { color: 'rgba(128,128,128,0.3)', width: 1, dash: 'dash' }
                                    });
                                  }
                                }
                                
                                return shapes;
                              })()
                            ],
                            yaxis: { 
                              title: {
                                text: 'KİMERİZM ORANI',
                                font: { size: 12 }
                              },
                              type: 'linear',
                              autorange: false,
                              range: globalYAxisRange,
                              showgrid: true,
                              gridcolor: 'rgba(128,128,128,0.1)',
                              fixedrange: false, // Zoom'a izin ver
                              // 0 değerlerin grafik dışına çıkmasını önle
                              zeroline: true,
                              zerolinecolor: 'rgba(128,128,128,0.3)',
                              zerolinewidth: 1,
                              // Minimum değer için güvenli sınır
                              constrain: 'domain'
                            },
                            legend: { 
                              orientation: 'v', 
                              x: 1.02, 
                              y: 0.85, // Biraz aşağıda başlasın
                              font: { size: 9 }, // Daha küçük font
                              bgcolor: 'rgba(255,255,255,0.8)', // Hafif saydam arka plan
                              bordercolor: 'rgba(0,0,0,0.1)',
                              borderwidth: 1
                            },
                            hovermode: 'closest',
                            margin: { 
                              t: isFullscreen ? 10 : 20, 
                              b: isFullscreen ? 40 : 60, 
                              l: isFullscreen ? 80 : 90, // Sol margin artırıldı - y ekseni etiketleri için
                              r: isFullscreen ? 5 : 10
                            },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            showlegend: true,
                            autosize: true,
                            // Grafik zoom/pan durumunu koru - sadece veri değiştiğinde reset et
                            uirevision: Array.from(visibleChannels).sort().join('-')
                          }}
                          config={{ 
                            responsive: true, 
                            displayModeBar: true,
                            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                            doubleClick: 'reset', // Çift tıklama ile reset
                            toImageButtonOptions: {
                              format: 'png',
                              filename: `${patient.meta.patient_code}_timeline`,
                              height: isFullscreen ? window.innerHeight - 120 : chartHeight,
                              width: isFullscreen ? window.innerWidth - panelWidth - 50 : undefined,
                              scale: 2
                            }
                          }}
                          className="w-full h-full"
                          style={{ 
                            width: '100%', 
                            height: isFullscreen ? 'calc(100vh - 200px)' : `${chartHeight}px`,
                            minHeight: '400px',
                            maxWidth: '100%'
                          }}
                          onInitialized={(figure: unknown, graphDiv: unknown) => {
                            const div = graphDiv as { on?: (event: string, handler: (evt: unknown) => void) => void };
                            if (div && div.on) {
                              // Click event'ini ekle - grafik state'ini koruyarak
                              div.on('plotly_click', (evt: unknown) => {
                                const event = evt as { points?: Array<{ customdata?: { phase?: number; channel?: string; value?: number; localIdx?: number; timeIndex?: number } }> };
                                const cd = event.points?.[0]?.customdata;
                                if (cd && typeof cd.phase === 'number') {
                                  setPinnedInfo({ 
                                    phase: cd.phase, 
                                    channel: cd.channel ?? '', 
                                    value: cd.value ?? 0, 
                                    localIdx: cd.localIdx ?? 0,
                                    timeIndex: cd.timeIndex ?? 0
                                  });
                                }
                              });
                            }
                          }}
                        />
                    </div>
                  )}
                      </div>
                      
                {/* Sağ Panel - Normal modda çok kompakt, tam ekranda resizable */}
                <div className={`${isFullscreen ? '' : 'w-full lg:w-64 lg:max-w-xs lg:flex-shrink-0 lg:overflow-hidden'}`}>
                  <div 
                    className={`${isFullscreen ? 'bg-gradient-to-b from-slate-50 to-slate-100 border-l shadow-lg relative' : 'w-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm max-w-full'} transition-all duration-300`}
                    style={{
                      width: isFullscreen ? `${panelWidth}px` : '100%'
                    }}
                  >
                  {/* Tam ekran modunda resizable handle */}
                  {isFullscreen && (
                    <div
                      className={`absolute left-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-200 transition-colors ${
                        isResizing ? 'bg-blue-300' : 'bg-transparent hover:bg-blue-100'
                      }`}
                      onMouseDown={handleMouseDown}
                      style={{ marginLeft: '-4px' }}
                    >
                      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 rounded-full opacity-60"></div>
                    </div>
                  )}

                  {/* Panel İçeriği - Normal modda kanal kontrolleri, tam ekranda detaylı analiz */}
                  <div 
                    className="h-full p-3 overflow-y-auto overflow-x-hidden"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9',
                      height: isFullscreen ? '100vh' : `${chartHeight}px`,
                      maxWidth: '100%'
                    }}
                  >
                    {isFullscreen ? (
                      /* Tam ekran modunda detaylı analiz paneli */
                        <div className="space-y-4">
                        {/* Ana Başlık */}
                        <div className="text-center border-b pb-3 relative mb-4 sticky top-0 bg-gradient-to-b from-slate-50 to-transparent z-10">
                          <h2 className="text-lg font-bold text-slate-800 mb-1">🧬 DETAYLI KİMERİZM ANALİZİ</h2>
                          <p className="text-xs text-slate-600">Chromosome Bazlı Risk Değerlendirmesi & Klinik Öneriler</p>
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            {showFullscreenSettings ? 
                              "⚙️ Grafik ayarları açık - Ayarları kapatmak için üstteki butonu kullanın" : 
                              "Grafikte bir noktaya tıklayarak başlayın"
                            }
                               </div>
                        
                                     </div>

                        {/* Conditional Tam Ekran Grafik Kontrolleri */}
                        {showFullscreenSettings && (
                          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 animate-in slide-in-from-top-2 duration-300">
                          <h4 className="font-semibold text-gray-700 text-sm mb-3">📊 Grafik Boyut Kontrolleri</h4>
                          <div className="space-y-3">
                            {/* Boyut Kontrolleri */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Grafik Yüksekliği:</span>
                              <div className="flex items-center space-x-1 border rounded-md">
                                <Button variant="ghost" size="sm" onClick={decreaseHeight} title="Yüksekliği azalt">
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="px-2 text-xs text-muted-foreground min-w-[50px] text-center">{chartHeight}px</span>
                                <Button variant="ghost" size="sm" onClick={increaseHeight} title="Yüksekliği artır">
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={resetHeight} title="Varsayılan boyut">
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                                     </div>
                               </div>
                            
                                                    {/* Çizgi Kontrolleri */}
                            <div className="grid grid-cols-1 gap-2">
                              <Button 
                                variant={showPersonalThresholds ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowPersonalThresholds(!showPersonalThresholds)}
                                className="text-xs h-8 justify-start"
                              >
                                📏 Kişisel Çizgiler (Eşikler)
                              </Button>
                              
                              <Button 
                                variant={showPersonalTrend ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowPersonalTrend(!showPersonalTrend)}
                                className="text-xs h-8 justify-start"
                              >
                                📈 Kişisel Trend
                              </Button>
                              
                              <Button 
                                variant={showPersonalAverage ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowPersonalAverage(!showPersonalAverage)}
                                className="text-xs h-8 justify-start"
                              >
                                📊 Kişisel Ortalama
                              </Button>
                              
                              <Button 
                                variant={showGeneralTrend ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowGeneralTrend(!showGeneralTrend)}
                                className="text-xs h-8 justify-start"
                              >
                                📉 Genel Trend Çizgisi
                              </Button>
                            </div>

                            {/* Kanal Hızlı Kontrolleri */}
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={toggleAllChannels}
                                className="flex-1 text-xs h-8"
                                title={visibleChannels.size === patient.channels.length ? "Tüm kanalları gizle" : "Tüm kanalları göster"}
                              >
                                {visibleChannels.size === patient.channels.length ? (
                                  <>
                                    <EyeOff className="mr-1 h-3 w-3" />
                                    Hepsini Gizle
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-1 h-3 w-3" />
                                    Hepsini Göster
                                  </>
                                )}
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setVisibleChannels(new Set(patient.default_on))}
                                className="flex-1 text-xs h-8"
                                title="Varsayılan kanalları göster"
                              >
                                🎯 Varsayılan
                              </Button>
                          </div>
                          
                            {/* Export Button */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={exportPNG}
                              className="w-full text-xs h-8"
                            >
                              <Download className="mr-2 h-3 w-3" />
                              PNG Olarak İndir
                            </Button>

                            {/* Kanal Seçimleri Bölümü */}
                            <div className="pt-4 border-t border-gray-200">
                              <h4 className="font-semibold text-gray-700 text-sm mb-3">🧬 KANAL SEÇİMLERİ</h4>
                              <div className="space-y-3">
          {/* Hızlı Seçim Butonları */}
                            <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectHighValueChannels}
                                    className="text-xs h-8 justify-start"
            >
              🔥 Yüksek Değerler
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAnomalyChannels}
                                    className="text-xs h-8 justify-start"
            >
              ⚠️ Anomalili Kanallar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectTrendingChannels}
                                    className="text-xs h-8 justify-start"
            >
              📈 Yükselen Trend
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setVisibleChannels(new Set(patient.default_on))}
                                    className="text-xs h-8 justify-start"
            >
              🎯 Varsayılan
            </Button>
            </div>

                                {/* Kanal Durumu */}
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                  <div className="text-lg font-bold text-blue-600">{visibleChannels.size}</div>
                                  <div className="text-xs text-gray-600">/ {patient.channels.length} kanal aktif</div>
          </div>

                                {/* Kompakt Kanal Listesi - Responsive Grid */}
                                <div className="max-h-48 overflow-y-auto">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {patient.channels.map((channel: string) => {
              const isVisible = visibleChannels.has(channel);
              const channelColor = getChannelColor(channel);
              const channelPoints = timelineByChannel[channel] || [];
              const hasAnomalies = channelPoints.some(p => Object.values(p.flags).some(Boolean));
              const avgValue = channelPoints.length > 0 ? 
                channelPoints.reduce((sum, p) => sum + p.value, 0) / channelPoints.length : 0;
              
                                      const riskLevel = avgValue < 0.5 ? 'normal' : 
                                                       avgValue < 2.0 ? 'warning' : 
                                                       avgValue < 5.0 ? 'critical' : 'danger';
                                      
                                      const riskStyles = {
                                        normal: 'border-green-200 bg-green-50',
                                        warning: 'border-yellow-200 bg-yellow-50',
                                        critical: 'border-orange-200 bg-orange-50',
                                        danger: 'border-red-200 bg-red-50'
                                      };
              
              return (
                                        <div key={channel} 
                                          className={`flex flex-col items-center p-1 rounded border transition-all text-center cursor-pointer ${
                                            isVisible 
                                              ? `${riskStyles[riskLevel]} border-opacity-100 shadow-sm` 
                                              : 'border-gray-200 bg-gray-50 border-opacity-50'
                                          }`}
                                          onClick={() => toggleChannel(channel)}
                                          onDoubleClick={() => showOnlyChannel(channel)}
                                        >
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={() => toggleChannel(channel)}
                                            className="mb-1 h-3 w-3"
                  />
                    <div 
                                            className="w-2 h-2 rounded-full border border-white shadow-sm mb-1" 
                      style={{ backgroundColor: channelColor }}
                    />
                                          <div className="text-xs font-bold truncate w-full">{channel}</div>
                                          <div className="flex items-center justify-center space-x-1">
                                            {hasAnomalies && <span className="text-orange-600 text-xs">⚠️</span>}
                                            {avgValue > 5.0 && <span className="text-red-600 text-xs">🚨</span>}
                      </div>
                                          <div className={`text-xs font-bold ${
                                            riskLevel === 'normal' ? 'text-green-700' :
                                            riskLevel === 'warning' ? 'text-yellow-700' :
                                            riskLevel === 'critical' ? 'text-orange-700' : 'text-red-700'
                                          }`}>
                                            {avgValue.toFixed(1)}%
                    </div>
                </div>
              );
            })}
          </div>
              </div>
                      </div>
              </div>
              </div>
            </div>
          )}

                        {/* Detaylı Analiz İçeriği */}
                        {pinnedInfo ? (
                        <div className="space-y-4">
                                {/* Chromosome Bilgileri */}
                                <div className="bg-white rounded-lg border shadow-sm p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-blue-800">📊 {pinnedInfo.channel} Analizi</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setPinnedInfo(null)} className="text-xs h-6 w-6 p-0">✕</Button>
                               </div>
                                
                                  {/* Ana Değer */}
                                  <div className="text-center mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded">
                                    <div className="text-2xl font-bold text-blue-900">{pinnedInfo.value.toFixed(3)}</div>
                                    <div className="text-sm text-blue-700">Güncel Kimerizm Oranı</div>
                                    <div className="text-xs text-blue-600 mt-1">
                                      {['İlk 48 Saat','Günlük İzlem','Haftalık Kontrol','Aylık Takip'][pinnedInfo.phase]} 
                                      • {pinnedInfo.timeIndex + 1}. ölçüm
                  </div>
                </div>
                                
                                  {/* Risk Durumu */}
                                  <div className={`p-3 rounded-lg border-2 mb-4 ${
                                    pinnedInfo.value < 0.5 ? 'bg-green-50 border-green-300' :
                                    pinnedInfo.value < 2.0 ? 'bg-yellow-50 border-yellow-300' :
                                    pinnedInfo.value < 5.0 ? 'bg-orange-50 border-orange-300' : 'bg-red-50 border-red-300'
                                  }`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-bold text-sm">Risk Seviyesi:</span>
                                      <span className={`font-bold ${
                                        pinnedInfo.value < 0.5 ? 'text-green-700' :
                                        pinnedInfo.value < 2.0 ? 'text-yellow-700' :
                                        pinnedInfo.value < 5.0 ? 'text-orange-700' : 'text-red-700'
                                      }`}>
                                        {pinnedInfo.value < 0.5 ? '✅ Normal' :
                                         pinnedInfo.value < 2.0 ? '🟡 Dikkat' :
                                         pinnedInfo.value < 5.0 ? '🟠 Kritik' : '🔴 Çok Kritik'}
                                       </span>
                                     </div>
                                    <div className="text-xs">
                                      <strong>Açıklama:</strong> {
                                        pinnedInfo.value < 0.5 ? 'Nakil başarılı seyrediyor. Düzenli takip yeterli.' :
                                        pinnedInfo.value < 2.0 ? 'Yakın takip gerekli. Ölçüm sıklığı artırılabilir.' :
                                        pinnedInfo.value < 5.0 ? 'Kritik seviye. İmmünosüpresif tedavi gözden geçirilmeli.' : 
                                        'Acil müdahale gerekli. Red riski yüksek!'
                                      }
                               </div>
                               </div>
                                
                                  {/* Klinik Öneriler */}
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                    <h4 className="font-bold text-blue-800 text-sm mb-2">🏥 Klinik Öneriler</h4>
                                    <div className="text-xs space-y-1">
                                      {pinnedInfo.value < 0.5 ? (
                                        <>
                                          <div>• Mevcut tedavi protokolüne devam</div>
                                          <div>• 3 aylık takip yeterli</div>
                                          <div>• Hasta bilgilendirmesi: İyi seyir</div>
                                        </>
                                      ) : pinnedInfo.value < 2.0 ? (
                                        <>
                                          <div>• Aylık kontrol önerilir</div>
                                          <div>• İmmünosüpresif doz değerlendirmesi</div>
                                          <div>• Ek chromosome analizi düşünülebilir</div>
                                        </>
                                      ) : pinnedInfo.value < 5.0 ? (
                                        <>
                                          <div>• Acil hematolog konsültasyonu</div>
                                          <div>• İmmünosüpresif tedavi artırımı</div>
                                          <div>• Haftalık kimerizm takibi</div>
                                          <div>• Donör lenfosit infüzyonu değerlendirmesi</div>
                                        </>
                                      ) : (
                                        <>
                                          <div>• ⚠️ ACİL HEMATOLOJİ KONSÜLTASYONU</div>
                                          <div>• Yoğun immünosüpresif tedavi</div>
                                          <div>• Günlük kimerizm monitoringü</div>
                                          <div>• DLI (Donör Lenfosit İnfüzyonu) hazırlığı</div>
                                          <div>• Hastane yatış değerlendirmesi</div>
                                        </>
                                      )}
                            </div>
                          </div>
                          
                                  
                          
                                  {/* Trend Analizi - Collapsible */}
                                  {(() => {
                                    const channelData = timelineByChannel[pinnedInfo.channel] || [];
                                    const currentIndex = channelData.findIndex(p => 
                                      p.phase_code === pinnedInfo.phase && 
                                      p.phase_index === pinnedInfo.timeIndex
                                    );
                                    const previousPoint = currentIndex > 0 ? channelData[currentIndex - 1] : null;
                                    const firstPoint = channelData.length > 0 ? channelData[0] : null;
                                    const trend = previousPoint ? pinnedInfo.value - previousPoint.value : null;
                                    const totalChange = firstPoint ? pinnedInfo.value - firstPoint.value : null;
                                
                                   return (
                                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                                        <div 
                                          className="flex items-center justify-between cursor-pointer hover:bg-indigo-100 rounded p-1 -m-1 transition-colors"
                                          onClick={() => setShowTrendAnalysis(!showTrendAnalysis)}
                                        >
                                          <h4 className="font-bold text-indigo-800 text-sm">📈 Trend Analizi</h4>
                                          <div className={`text-indigo-800 transition-transform ${showTrendAnalysis ? 'rotate-180' : ''}`}>
                                            ▼
                    </div>
                </div>
                                        {showTrendAnalysis && (
                                          <div className="space-y-2 text-xs mt-2">
                                          {previousPoint ? (
                                            <>
                                              <div className="flex justify-between">
                                                <span>Önceki Değer:</span>
                                                <span className="font-bold">{previousPoint.value.toFixed(3)}</span>
                    </div>
                                              <div className="flex justify-between">
                                                <span>Değişim:</span>
                                                <span className={`font-bold ${trend! > 0 ? 'text-red-600' : trend! < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                  {trend! > 0 ? '↗️' : trend! < 0 ? '↘️' : '→'} {trend!.toFixed(3)}
                                       </span>
                                     </div>
                                              <div className="flex justify-between">
                                                <span>İlk Değerden Değişim:</span>
                                                <span className={`font-bold ${totalChange! > 0 ? 'text-red-600' : totalChange! < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                  {totalChange! > 0 ? '↗️' : totalChange! < 0 ? '↘️' : '→'} {totalChange!.toFixed(3)}
                                                </span>
                                              </div>
                                              
                                              <div className="mt-2 pt-2 border-t border-indigo-300">
                                                <strong>Kısa Vadeli Trend:</strong> {
                                                  Math.abs(trend!) < 0.1 ? 'Stabil seyir' :
                                                  trend! > 0.5 ? '⚠️ Hızlı artış - Yakın takip' :
                                                  trend! > 0 ? 'Hafif artış - İzleme devam' :
                                                  trend! < -0.5 ? '✅ Belirgin iyileşme' : '✅ Hafif iyileşme'
                                                }
                                              </div>
                                              <div className="mt-1">
                                                <strong>Genel Seyir:</strong> {
                                                  Math.abs(totalChange!) < 0.2 ? 'Genel olarak stabil' :
                                                  totalChange! > 1.0 ? '🚨 Ciddi kötüleşme - Acil değerlendirme' :
                                                  totalChange! > 0.5 ? '⚠️ Belirgin artış - Yakın izlem' :
                                                  totalChange! > 0 ? 'Hafif artış eğilimi' :
                                                  totalChange! < -1.0 ? '🎉 Ciddi iyileşme' :
                                                  totalChange! < -0.5 ? '✅ İyi iyileşme' : '✅ Hafif iyileşme'
                                                }
                      </div>
                                            </>
                                          ) : (
                                            <div className="space-y-2">
                                              <div className="text-gray-600">İlk ölçüm - Önceki değer karşılaştırması mevcut değil</div>
                                              {firstPoint && (
                                                <div className="text-blue-700">
                                                  <strong>Başlangıç Değeri:</strong> {firstPoint.value.toFixed(3)} 
                                                  <span className="text-xs ml-1">({firstPoint.phase})</span>
                                                </div>
                                              )}
                    </div>
                  )}
                  
                                          {/* Ortalama ve istatistikler */}
                                          <div className="mt-3 pt-2 border-t border-indigo-300">
                                            <div className="flex justify-between">
                                              <span>Kanal Ortalaması:</span>
                                              <span className="font-bold">
                                                {(channelData.reduce((sum, p) => sum + p.value, 0) / channelData.length).toFixed(3)}
                                              </span>
                               </div>
                                            <div className="flex justify-between">
                                              <span>Maksimum Değer:</span>
                                              <span className="font-bold text-red-600">
                                                {Math.max(...channelData.map(p => p.value)).toFixed(3)}
                                              </span>
                        </div>
                                            <div className="flex justify-between">
                                              <span>Minimum Değer:</span>
                                              <span className="font-bold text-green-600">
                                                {Math.min(...channelData.map(p => p.value)).toFixed(3)}
                                              </span>
                      </div>
                                                              </div>
                    </div>
                  )}
                                     </div>
                                   );
                                  })()}

                                  {/* Uyarı Bayrakları - Kritiklik Nedenleri - Collapsible */}
                                  {(() => {
                                    const currentPoint = Array.from(visibleChannels)
                                      .flatMap(ch => (timelineByChannel[ch] || []))
                                      .find(p => 
                                        p.phase_code === pinnedInfo.phase && 
                                        p.channel === pinnedInfo.channel && 
                                        p.value === pinnedInfo.value &&
                                        p.phase_index === pinnedInfo.timeIndex
                                      );
                                    
                                    if (currentPoint && Object.values(currentPoint.flags).some(Boolean)) {
                                      const warnings = Object.entries(currentPoint.flags)
                                        .filter(([, flag]) => flag)
                                        .map(([key]) => {
                                          switch(key) {
                                            case 'ref_outlier': return { 
                                              text: 'Referans P97.5 Üstü', 
                                              desc: 'Bu değer referans grubunun %97.5\'inin üstünde. Popülasyon ortalamasından çok yüksek.',
                                              icon: '🟡', 
                                              severity: 'warning' 
                                            };
                                            case 'personal_high_crit': return { 
                                              text: 'Kişisel Kritik Eşik (+3MAD)', 
                                              desc: 'Hastanın kişisel ortalamasının +3MAD üstünde. İstatistiksel olarak çok anormal.',
                                              icon: '🔴', 
                                              severity: 'critical' 
                                            };
                                            case 'personal_high_warn': return { 
                                              text: 'Kişisel Uyarı Eşiği (+2MAD)', 
                                              desc: 'Hastanın kişisel ortalamasının +2MAD üstünde. Normalden belirgin sapma.',
                                              icon: '🟠', 
                                              severity: 'warning' 
                                            };
                                            case 'clinical_high': return { 
                                              text: 'Klinik Yüksek Eşik', 
                                              desc: 'Klinik müdahale gerektiren seviyeye ulaştı. Acil değerlendirme gerekli.',
                                              icon: '🔴', 
                                              severity: 'critical' 
                                            };
                                            case 'trend_up': return { 
                                              text: 'Yükselen Trend Algılandı', 
                                              desc: 'Sürekli artış trendi tespit edildi. İzleme sıklığı artırılmalı.',
                                              icon: '📈', 
                                              severity: 'info' 
                                            };
                                            default: return { 
                                              text: key.replace(/_/g, ' ').toUpperCase(), 
                                              desc: 'Detaylı açıklama mevcut değil.', 
                                              icon: '⚠️', 
                                              severity: 'info' 
                                            };
                                          }
                                        });
                                      
                                   return (
                                        <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4">
                                          <div 
                                            className="flex items-center justify-between cursor-pointer hover:bg-red-100 rounded p-1 -m-1 transition-colors"
                                            onClick={() => setShowCriticalityAnalysis(!showCriticalityAnalysis)}
                                          >
                                            <h4 className="font-bold text-red-800 text-sm">⚠️ KRİTİKLİK NEDENLERİ</h4>
                                            <div className={`text-red-800 transition-transform ${showCriticalityAnalysis ? 'rotate-180' : ''}`}>
                                              ▼
                               </div>
                                          </div>
                                          {showCriticalityAnalysis && (
                                            <div className="space-y-3 mt-2">
                                              {warnings.map((warning, idx) => (
                                              <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-red-400">
                                                <div className="flex items-start gap-3">
                                                  <span className="text-xl flex-shrink-0">{warning.icon}</span>
                                                  <div className="flex-1">
                                                    <div className="font-bold text-sm text-red-800 mb-1">{warning.text}</div>
                                                    <div className="text-xs text-red-700 leading-relaxed">{warning.desc}</div>
                                                    {warning.severity === 'critical' && (
                                                      <div className="mt-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
                                                        🚨 Kritik Seviye - Acil Müdahale
                             </div>
                           )}
                            </div>
                          </div>
                                              </div>
                                              ))}
                                              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs">
                                                <strong>📋 Değerlendirme:</strong> Bu uyarılar neden bu ölçümün kritik kabul edildiğini açıklamaktadır. 
                                                Her uyarı farklı bir risk faktörünü temsil eder ve klinik karar vermede önemlidir.
                                              </div>
                                            </div>
                                          )}
                                     </div>
                                   );
                                    } else {
                                   return (
                                        <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
                                          <div 
                                            className="flex items-center justify-between cursor-pointer hover:bg-green-100 rounded p-1 -m-1 transition-colors"
                                            onClick={() => setShowCriticalityAnalysis(!showCriticalityAnalysis)}
                                          >
                                            <h4 className="font-bold text-green-800 text-sm">✅ NORMAL DEĞER</h4>
                                            <div className={`text-green-800 transition-transform ${showCriticalityAnalysis ? 'rotate-180' : ''}`}>
                                              ▼
                               </div>
                               </div>
                                          {showCriticalityAnalysis && (
                                            <div className="text-xs text-green-700 space-y-1 mt-2">
                                              <div>• Bu ölçümde herhangi bir uyarı bayrağı bulunmuyor</div>
                                              <div>• Referans aralığında ve kişisel eşiklerin altında</div>
                                              <div>• Klinik olarak kabul edilebilir seviyede</div>
                             </div>
                           )}
                                        </div>
                                      );
                                    }
                                  })()}

                                  {/* Aksiyon Butonları */}
                                  <div className="flex gap-2 mt-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                      onClick={() => {
                                        if (pinnedInfo?.channel) {
                                          setVisibleChannels(new Set([pinnedInfo.channel]));
                                        }
                                      }}
                                      className="text-xs flex-1"
                                    >
                                      🎯 Sadece Bu Kanal
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                      onClick={() => setPinnedInfo(null)} 
                                className="text-xs"
                              >
                                      🗑️ Temizle
                              </Button>
                            </div>
                            </div>
                          </div>
                            ) : (
                              <div className="text-center py-12 text-gray-500 space-y-4">
                                <div className="text-6xl mb-4">🎯</div>
                                <div className="space-y-2">
                                  <div className="text-lg font-bold text-gray-700">Detaylı Analiz Başlatın</div>
                                  <div className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                                    Sol taraftaki grafikte herhangi bir chromosome noktasına tıklayarak 
                                    detaylı kimerizm analizini görüntüleyebilirsiniz
                                        </div>
                                      </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                                  <div className="text-xs text-blue-800 font-medium mb-2">💡 İpuçları:</div>
                                  <div className="text-xs text-blue-700 space-y-1">
                                    <div>• Grafikteki renkli noktalar uyarı seviyelerini gösterir</div>
                                    <div>• Bu paneli sol kenarından sürükleyerek boyutlandırabilirsiniz</div>
                                    <div>• İçerik fazla olduğunda mouse tekerleği ile scroll yapın</div>
                                  </div>
                            </div>
                          </div>
                  )}
                </div>
                      ) : (
                        /* Normal modda sadece kanal kontrolleri */
                        <div className="space-y-4 w-full overflow-hidden">
                          {/* Panel Başlığı */}
                          <div className="text-center border-b pb-2">
                            <h3 className="text-base font-bold text-gray-800 truncate">🧬 KANAL SEÇİMLERİ</h3>
                            <p className="text-xs text-gray-600">Chromosome kanalları</p>
                          </div>

                          {/* Sadece Hızlı Kanal Kontrolleri */}
                          <div className="space-y-2 w-full">
                            <div className="grid grid-cols-1 gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={toggleAllChannels}
                                className="w-full text-xs h-8 truncate"
                                title={visibleChannels.size === patient.channels.length ? "Tüm kanalları gizle" : "Tüm kanalları göster"}
                              >
                                {visibleChannels.size === patient.channels.length ? (
                                  <>
                                    <EyeOff className="mr-1 h-3 w-3" />
                                    Hepsini Gizle
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-1 h-3 w-3" />
                                    Hepsini Göster
                                  </>
                                )}
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setVisibleChannels(new Set(patient.default_on))}
                                className="w-full text-xs h-8 truncate"
                                title="Varsayılan kanalları göster"
                              >
                                🎯 Varsayılan
                              </Button>
                            </div>
                          </div>
                          
                          {/* Hızlı Seçim Butonları */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-gray-700 text-xs">🚀 Hızlı Seçimler</h4>
                            <div className="grid gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={selectHighValueChannels}
                                className="text-xs h-7 justify-start"
                              >
                                🔥 Yüksek
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={selectAnomalyChannels}
                                className="text-xs h-7 justify-start"
                              >
                                ⚠️ Anomali
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={selectTrendingChannels}
                                className="text-xs h-7 justify-start"
                              >
                                📈 Trend
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setVisibleChannels(new Set(patient.default_on))}
                                className="text-xs h-7 justify-start"
                              >
                                🎯 Varsayılan
                              </Button>
                            </div>
                          </div>

                          {/* Çizgi Kontrolleri */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-700 text-sm">📊 Çizgi ve Eşik Kontrolleri</h4>
                            <div className="space-y-2">
                              <Button 
                                variant={showPersonalThresholds ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowPersonalThresholds(!showPersonalThresholds)}
                                className="w-full justify-start h-10"
                              >
                                📏 Kişisel Çizgiler (Eşikler)
                              </Button>
                              
                              <Button 
                                variant={showPersonalTrend ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowPersonalTrend(!showPersonalTrend)}
                                className="w-full justify-start h-10"
                              >
                                📈 Kişisel Trend
                              </Button>
                              
                              <Button 
                                variant={showPersonalAverage ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowPersonalAverage(!showPersonalAverage)}
                                className="w-full justify-start h-10"
                              >
                                📊 Kişisel Ortalama
                              </Button>
                              
                              <Button 
                                variant={showGeneralTrend ? "default" : "outline"}
                                size="sm" 
                                onClick={() => setShowGeneralTrend(!showGeneralTrend)}
                                className="w-full justify-start h-10"
                              >
                                📉 Genel Trend Çizgisi
                              </Button>
                            </div>
                          </div>
                          
                          {/* Kanal Durumu */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-700 text-sm">📋 Kanal Durumu</h4>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={toggleAllChannels}
                                className="text-xs"
                              >
                                {visibleChannels.size === patient.channels.length ? (
                                  <>
                                    <EyeOff className="mr-1 h-3 w-3" />
                                    Hepsini Gizle
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-1 h-3 w-3" />
                                    Hepsini Göster
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-blue-600">{visibleChannels.size}</div>
                              <div className="text-sm text-gray-600">/ {patient.channels.length} kanal aktif</div>
                            </div>
                          </div>
                          
                          {/* Kanal Listesi - Ultra Kompakt Grid */}
                          <div className="space-y-2 w-full overflow-hidden">
                            <h4 className="font-semibold text-gray-700 text-xs truncate">🧬 Chromosome Kanalları</h4>
                            <div className="grid gap-1 grid-cols-2 w-full">
                              {patient.channels.map((channel: string) => {
                                const isVisible = visibleChannels.has(channel);
                                const channelColor = getChannelColor(channel);
                                const channelPoints = timelineByChannel[channel] || [];
                                const hasAnomalies = channelPoints.some(p => Object.values(p.flags).some(Boolean));
                                const avgValue = channelPoints.length > 0 ? 
                                  channelPoints.reduce((sum, p) => sum + p.value, 0) / channelPoints.length : 0;
                                
                                // Risk seviyesini belirle
                                const riskLevel = avgValue < 0.5 ? 'normal' : 
                                                 avgValue < 2.0 ? 'warning' : 
                                                 avgValue < 5.0 ? 'critical' : 'danger';
                                
                                const riskStyles = {
                                  normal: 'border-green-200 bg-green-50',
                                  warning: 'border-yellow-200 bg-yellow-50',
                                  critical: 'border-orange-200 bg-orange-50',
                                  danger: 'border-red-200 bg-red-50'
                                };
                                
                                return (
                                  <div key={channel} className={`flex flex-col items-center p-1 rounded border transition-all text-center cursor-pointer min-w-0 w-full ${
                                    isVisible 
                                      ? `${riskStyles[riskLevel]} border-opacity-100 shadow-sm` 
                                      : 'border-gray-200 bg-gray-50 border-opacity-50'
                                  }`}
                                  onClick={() => toggleChannel(channel)}
                                  onDoubleClick={() => showOnlyChannel(channel)}
                                  >
                                    <Checkbox
                                      checked={isVisible}
                                      onCheckedChange={() => toggleChannel(channel)}
                                        id={`channel-${channel}`}
                                        className="h-2 w-2 mb-1"
                                    />
                                      <div 
                                      className="w-2 h-2 rounded-full border border-white shadow-sm mb-1" 
                                        style={{ backgroundColor: channelColor }}
                                      />
                                    <div className="text-xs font-bold truncate w-full">{channel}</div>
                                    <div className="flex items-center justify-center">
                                      {hasAnomalies && <span className="text-orange-600 text-xs">⚠️</span>}
                                      {avgValue > 5.0 && <span className="text-red-600 text-xs">🚨</span>}
                                        </div>
                                    <div className={`text-xs font-bold ${
                                      riskLevel === 'normal' ? 'text-green-700' :
                                      riskLevel === 'warning' ? 'text-yellow-700' :
                                      riskLevel === 'critical' ? 'text-orange-700' : 'text-red-700'
                                    }`}>
                                      {avgValue.toFixed(1)}%
                                      </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anomali Detayları</CardTitle>
              <CardDescription>
                Kanal bazında tespit edilen anomaliler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patient.timeline
                  .filter((point: TimelinePoint) => Object.values(point.flags).some(Boolean))
                  .map((point: TimelinePoint, idx: number) => {
                    const channelColor = getChannelColor(point.channel);
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: channelColor }}
                            />
                            <span>{point.channel}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{point.phase}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{point.value.toFixed(3)}%</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {point.flags.ref_outlier && (
                              <span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                Referans P97.5 üstü
                              </span>
                            )}
                            {point.flags.personal_high_crit && (
                              <span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                Kişisel +3MAD üstü
                              </span>
                            )}
                            {point.flags.personal_high_warn && !point.flags.personal_high_crit && (
                              <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                                Kişisel +2MAD üstü
                              </span>
                            )}
                            {point.flags.clinical_high && (
                              <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                                Klinik eşik üstü
                              </span>
                            )}
                          </div>
                        </div>
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      </div>
                    );
                  })}
                
                {patient.summary.total_anomalies === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Hiçbir kanalda anomali tespit edilmedi
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kanal İstatistikleri</CardTitle>
              <CardDescription>
                Hasta bazında kanal performansı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Kanal</th>
                      <th className="text-right py-2">Ölçüm</th>
                      <th className="text-right py-2">Min</th>
                      <th className="text-right py-2">Max</th>
                      <th className="text-right py-2">Ortalama</th>
                      <th className="text-right py-2">Anomali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.channels.map((channel: string) => {
                      const channelPoints = timelineByChannel[channel] || [];
                      const values = channelPoints.map(p => p.value);
                      const anomalies = channelPoints.filter(p => 
                        Object.values(p.flags).some(Boolean)
                      ).length;
                      const channelColor = getChannelColor(channel);
                      
                      return (
                        <tr key={channel} className="border-b">
                          <td className="py-2">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: channelColor }}
                              />
                              <span>{channel}</span>
                            </div>
                          </td>
                          <td className="text-right py-2">{values.length}</td>
                          <td className="text-right py-2">
                            {values.length > 0 ? Math.min(...values).toFixed(3) : '-'}
                          </td>
                          <td className="text-right py-2">
                            {values.length > 0 ? Math.max(...values).toFixed(3) : '-'}
                          </td>
                          <td className="text-right py-2">
                            {values.length > 0 ? 
                              (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3) : '-'}
                          </td>
                          <td className="text-right py-2">
                            {anomalies > 0 ? (
                              <span className="text-red-600 font-medium">{anomalies}</span>
                            ) : (
                              <span className="text-green-600">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hasta Özellikleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hasta Kodu:</span>
                  <span className="font-medium">{patient.meta.patient_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplam Ölçüm:</span>
                  <span className="font-medium">{patient.meta.n_measurements}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kanal Sayısı:</span>
                  <span className="font-medium">{patient.meta.n_channels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplam Anomali:</span>
                  <span className="font-medium">{patient.summary.total_anomalies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HX/GX Grubu:</span>
                  <span className="font-medium">{patient.meta.is_hxgx ? 'Evet' : 'Hayır'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kişisel Eşikler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Post-48s Median:</span>
                  <span className="font-medium">
                    {patient.personal.post48_median ? 
                      patient.personal.post48_median.toFixed(3) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Post-48s MAD:</span>
                  <span className="font-medium">
                    {patient.personal.post48_mad ? 
                      patient.personal.post48_mad.toFixed(3) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uyarı Eşiği (+2MAD):</span>
                  <span className="font-medium text-orange-600">
                    {patient.personal.warn_threshold ? 
                      patient.personal.warn_threshold.toFixed(3) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kritik Eşiği (+3MAD):</span>
                  <span className="font-medium text-red-600">
                    {patient.personal.crit_threshold ? 
                      patient.personal.crit_threshold.toFixed(3) + '%' : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}