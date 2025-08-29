declare module 'react-plotly.js' {
  import { Component } from 'react';
  
  // Temel Plotly tip tanımları
  interface PlotData extends Record<string, unknown> {
    x?: unknown[];
    y?: unknown[];
    type?: string;
    mode?: string;
    name?: string;
    line?: Record<string, unknown>;
    marker?: Record<string, unknown>;
  }
  type PlotLayout = Record<string, unknown>;
  type PlotConfig = Record<string, unknown>;
  type PlotFigure = Record<string, unknown>;
  type PlotElement = HTMLElement;
  
  interface PlotParams {
    data: PlotData[];
    layout?: PlotLayout;
    config?: PlotConfig;
    className?: string;
    style?: React.CSSProperties;
    onInitialized?: (figure: PlotFigure, graphDiv: PlotElement) => void;
    onUpdate?: (figure: PlotFigure, graphDiv: PlotElement) => void;
    onPurge?: (figure: PlotFigure, graphDiv: PlotElement) => void;
    onError?: (error: Error) => void;
    debug?: boolean;
    useResizeHandler?: boolean;
    divId?: string;
  }
  
  export default class Plot extends Component<PlotParams> {}
}
