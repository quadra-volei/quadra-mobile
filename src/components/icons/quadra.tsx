import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/colors';

// Quadra's icon family, from the designer's SVGs (DECISIONS #198). Fixed stroke on a 32 grid, painted
// with currentColor, so the only knobs are size and color.
export type QuadraIconProps = {
  size?: number;
  color?: string;
  testID?: string;
};

export type QuadraIcon = (props: QuadraIconProps) => ReactNode;

const icon =
  (shapes: ReactNode): QuadraIcon =>
  ({ size = 24, color = colors.surfaceDark, testID }) => (
    <Svg testID={testID} width={size} height={size} viewBox="0 0 32 32" fill="none" color={color}>
      {shapes}
    </Svg>
  );

export const IconAberta = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M7 27V6H25V27M12 27V11L25 6" strokeWidth="2.8" /></G>,
);
export const IconAbrirExterno = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M18 4H28V14M28 4 15 17M12 6H6V27H26V20" /></G>,
);
export const IconAces = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="22" cy="16" r="6" /><Path d="M5 11H11M3 21H10" strokeWidth="3.1" /></G>,
);
export const IconAdicionarFoto = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M18 6H5V26H27V17M5 23 13 15 22 24M25 3V11M21 7H29" /><Circle cx="12" cy="10" r="1.6" fill="currentColor" stroke="none" /></G>,
);
export const IconAdicionarJogador = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="11" cy="9" r="4.5" /><Path d="M2 27V24C2 18 20 18 20 24V27M25 12V22M20 17H30" /></G>,
);
export const IconAdicionar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 6V26M6 16H26" strokeWidth="3.4" /></G>,
);
export const IconAjuda = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="16" r="12" /><Path d="M11 11C11 5 22 6 21 12C21 15 16 15 16 19" /><Circle cx="16" cy="24" r="1.6" fill="currentColor" stroke="none" /></G>,
);
export const IconAmpliar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M19 5H27V13M27 5 19 13M5 19V27H13M5 27 13 19" /></G>,
);
export const IconAreia = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M17 27C15 20 16 13 19 8M19 8C14 2 7 5 5 10C10 7 15 8 19 8M19 8C22 2 28 5 29 10C25 8 22 8 19 8M19 8C23 10 25 13 24 17M4 28Q16 23 28 28" /></G>,
);
export const IconAssistencias = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="7" cy="22" r="3.5" fill="currentColor" stroke="none" /><Path d="M8 15C10 9 17 9 26 11M21 6 27 11 21 16" strokeWidth="3" /></G>,
);
export const IconAvancar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 7 21 16 12 25" strokeWidth="3.2" /></G>,
);
export const IconAvulso = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="6" y="7" width="20" height="20" rx="3" /><Path d="M11 4V9M21 4V9M6 13H26" /><Circle cx="16" cy="20" r="2.8" fill="currentColor" stroke="none" /></G>,
);
export const IconBaixar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 4V21M9 14 16 21 23 14M5 24V28H27V24" /></G>,
);
export const IconBlocks = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="7.5" r="3.7" fill="currentColor" stroke="none" /><Path d="M6 25V15H26V25" strokeWidth="3.3" /></G>,
);
export const IconBloquearJogador = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="11" cy="9" r="4.5" /><Path d="M2 27V24C2 18 20 18 20 24V27M23 12 30 19M30 12 23 19" /></G>,
);
export const IconBuscar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="13.6" cy="13.6" r="9.1" /><Path d="m20.4 20.4 7.1 7.1" strokeWidth="3.5" /></G>,
);
export const IconCampeao = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 9 10 15 16 5 22 15 28 9 25 25H7ZM8 29H24" /></G>,
);
export const IconCancelarPartida = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="16" r="12" /><Path d="M11 11 21 21M21 11 11 21" /></G>,
);
export const IconCarro = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 14 8 5H24L27 14V26H23V23H9V26H5ZM5 14H27M10 19H11M21 19H22" /></G>,
);
export const IconCentral = icon(
  <G fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="5.8" r="3.6" strokeWidth="1.85" /><Path d="M16.648 2.272Q14.272 4.72 15.82 6.088Q18.016000000000002 6.016 19.312 7.204M15.82 6.088Q15.928 7.96 14.092 8.86" strokeWidth="1.25" /><Path d="M6 14H26Q28 14 28 16V28H4V16Q4 14 6 14Z" strokeWidth="2.7" /><Path d="M4 21H28M16 14V21M12 21V28M20 21V28" strokeWidth="2.3" /></G>,
);
export const IconCentralizar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="16" r="8.5" /><Circle cx="16" cy="16" r="3.4" fill="currentColor" stroke="none" /><Path d="M16 2V7M16 25V30M2 16H7M25 16H30" /></G>,
);
export const IconComentar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 5C8 5 4 9 4 15C4 19 6 22 9 23L7 28 16 25C24 25 28 21 28 15S24 5 16 5Z" /></G>,
);
export const IconCompartilhar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="7" cy="16" r="3.7" /><Circle cx="25" cy="7" r="3.7" /><Circle cx="25" cy="25" r="3.7" /><Path d="m10.4 14.3 11.2-5.6M10.4 17.7l11.2 5.6" /></G>,
);
export const IconConfiguracoes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M28.549 15.458Q28.700 16.000 28.549 16.542Q28.398 17.085 27.985 17.563Q27.571 18.040 27.002 18.418Q26.432 18.795 25.844 19.082Q25.256 19.369 24.776 19.619Q24.297 19.869 24.002 20.159Q23.708 20.450 23.603 20.850Q23.499 21.251 23.522 21.791Q23.546 22.331 23.591 22.984Q23.637 23.637 23.595 24.319Q23.553 25.001 23.346 25.598Q23.138 26.195 22.744 26.597Q22.350 26.999 21.805 27.139Q21.260 27.279 20.639 27.160Q20.019 27.041 19.407 26.737Q18.795 26.432 18.253 26.066Q17.710 25.700 17.254 25.410Q16.798 25.120 16.399 25.010Q16.000 24.900 15.601 25.010Q15.202 25.120 14.746 25.410Q14.290 25.700 13.747 26.066Q13.205 26.432 12.593 26.737Q11.981 27.041 11.361 27.160Q10.740 27.279 10.195 27.139Q9.650 26.999 9.256 26.597Q8.862 26.195 8.654 25.598Q8.447 25.001 8.405 24.319Q8.363 23.637 8.409 22.984Q8.454 22.331 8.478 21.791Q8.501 21.251 8.397 20.850Q8.292 20.450 7.998 20.159Q7.703 19.869 7.224 19.619Q6.744 19.369 6.156 19.082Q5.568 18.795 4.998 18.418Q4.429 18.040 4.015 17.563Q3.602 17.085 3.451 16.542Q3.300 16.000 3.451 15.458Q3.602 14.915 4.015 14.437Q4.429 13.960 4.998 13.582Q5.568 13.205 6.156 12.918Q6.744 12.631 7.224 12.381Q7.703 12.131 7.998 11.841Q8.292 11.550 8.397 11.150Q8.501 10.749 8.478 10.209Q8.454 9.669 8.409 9.016Q8.363 8.363 8.405 7.681Q8.447 6.999 8.654 6.402Q8.862 5.805 9.256 5.403Q9.650 5.001 10.195 4.861Q10.740 4.721 11.361 4.840Q11.981 4.959 12.593 5.263Q13.205 5.568 13.747 5.934Q14.290 6.300 14.746 6.590Q15.202 6.880 15.601 6.990Q16.000 7.100 16.399 6.990Q16.798 6.880 17.254 6.590Q17.710 6.300 18.253 5.934Q18.795 5.568 19.407 5.263Q20.019 4.959 20.639 4.840Q21.260 4.721 21.805 4.861Q22.350 5.001 22.744 5.403Q23.138 5.805 23.346 6.402Q23.553 6.999 23.595 7.681Q23.637 8.363 23.591 9.016Q23.546 9.669 23.522 10.209Q23.499 10.749 23.603 11.150Q23.708 11.550 24.002 11.841Q24.297 12.131 24.776 12.381Q25.256 12.631 25.844 12.918Q26.432 13.205 27.002 13.582Q27.571 13.960 27.985 14.437Q28.398 14.915 28.549 15.458Z" /><Circle cx="16" cy="16" r="4.4" /></G>,
);
export const IconConfirmarPresenca = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M27 14V7H5V28H16M10 4V10M22 4V10M5 14H27M19 24 23 28 30 19" strokeWidth="2.5" /></G>,
);
export const IconConfirmar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 17 12 24 27 8" strokeWidth="3.2" /></G>,
);
export const IconCoringa = icon(
  <G fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><Path d="M9 8 5 9Q3 9.5 4 12L7.8 26.5Q8 27.4 9.8 27.7M23 8 27 9Q29 9.5 28 12L24.2 26.5Q24 27.4 22.2 27.7" strokeWidth="2.4" /><Rect x="9" y="4" width="14" height="24" rx="3" strokeWidth="2.7" /><Path d="M16 10Q17.08 14.5 20 16Q17.08 17.5 16 22Q14.92 17.5 12 16Q14.92 14.5 16 10Z" strokeWidth="2.3" fill="currentColor" stroke="none" /></G>,
);
export const IconCortadas = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="8" cy="8" r="4" fill="currentColor" stroke="none" /><Path d="M15 15 25 25M16 25H25V16" strokeWidth="3.1" /></G>,
);
export const IconCuradoria = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M23 13C23 19 14 28 14 28S5 19 5 13A9 9 0 0 1 23 13Z" /><Circle cx="14" cy="12" r="3" /><Path d="M21 24 24 27 30 20" /></G>,
);
export const IconCurtir = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 27C10 23 4 18 4 11A6.6 6.6 0 0 1 16 7A6.6 6.6 0 0 1 28 11C28 18 22 23 16 27Z" /></G>,
);
export const IconData = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="5" y="6" width="22" height="22" rx="4" /><Path d="M11 3V9M21 3V9M5 13H27" /><Rect x="10" y="18" width="4" height="4" rx="1" fill="currentColor" stroke="none" /></G>,
);
export const IconDescer = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 5V27M8 19 16 27 24 19" /></G>,
);
export const IconDiminuir = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 16H26" strokeWidth="3.4" /></G>,
);
export const IconDivulgar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12H12L26 7V24L12 19H5ZM12 12V19M10 19 12 26H17L15 20" /></G>,
);
export const IconEditar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M7 21 21 7Q23 5 25 7L27 9Q29 11 27 13L13 27 5 29ZM18 10 24 16M7 21 13 27" /></G>,
);
export const IconEncerrar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M7 27V6M7 7C14 3 18 12 26 7V20C18 25 14 16 7 20" /></G>,
);
export const IconEntrar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M19 5H27V27H19M4 16H23M16 9 23 16 16 23" /></G>,
);
export const IconEnviar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 6 29 16 4 26 8 16ZM8 16H20" /></G>,
);
export const IconEquilibrarTimes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 4V28M9 28H23M5 10H27M8 10 3 21H13ZM24 10 19 21H29Z" /></G>,
);
export const IconEstatisticas = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 5V28H29" /><Rect x="9" y="17" width="3.8" height="7" rx="1.4" fill="currentColor" stroke="none" /><Rect x="16" y="8" width="3.8" height="16" rx="1.4" fill="currentColor" stroke="none" /><Rect x="23" y="12" width="3.8" height="12" rx="1.4" fill="currentColor" stroke="none" /></G>,
);
export const IconExcluir = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 9H26L24 28H8ZM4 8H28M12 8V4H20V8M12 14V23M20 14V23" /></G>,
);
export const IconExpandir = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M7 12 16 21 25 12" strokeWidth="3.2" /></G>,
);
export const IconFechar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M8 8 24 24M24 8 8 24" strokeWidth="3.2" /></G>,
);
export const IconFeedback = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M9 6H23Q27 6 27 10V19Q27 23 23 23H15L8 27V23H9Q5 23 5 19V10Q5 6 9 6Z" /><Path d="M11 14H21" /></G>,
);
export const IconFiltros = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 8H28M4 16H28M4 24H28" /><Path d="M11 5V11M22 13V19M13 21V27" strokeWidth="4.7" /></G>,
);
export const IconGrade = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="5" y="5" width="8" height="8" rx="2.5" /><Rect x="19" y="5" width="8" height="8" rx="2.5" /><Rect x="5" y="19" width="8" height="8" rx="2.5" /><Rect x="19" y="19" width="8" height="8" rx="2.5" /></G>,
);
export const IconGratuito = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 8H23L29 16 23 24H5Z" /><Circle cx="10" cy="16" r="1.5" fill="currentColor" stroke="none" /><Path d="M18 12C13 12 13 20 18 20S23 12 18 12Z" /></G>,
);
export const IconHorario = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="16" r="12" /><Path d="M16 8V16L22 19" strokeWidth="2.9" /></G>,
);
export const IconIniciar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M9 5Q7 4 7 7V25Q7 28 10 26L27 17Q29 16 27 15Z" fill="currentColor" stroke="none" /></G>,
);
export const IconInicio = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 14 16 4 27 14V27H20V22A4 4 0 0 0 12 22V27H5Z" /><Path d="M12 27V22A4 4 0 0 1 20 22V27Z" fill="currentColor" stroke="none" /></G>,
);
export const IconIr = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 16H27M19 8 27 16 19 24" /></G>,
);
export const IconLembrete = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M27 13V7H5V28H14M10 4V10M22 4V10M5 14H16" strokeWidth="2.5" /><Circle cx="23" cy="23" r="7" /><Path d="M23 19V23L26 25" strokeWidth="2.1" /></G>,
);
export const IconLevantador = icon(
  <G fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="23" r="4.4" strokeWidth="1.85" /><Path d="M16.792 18.688Q13.888 21.68 15.78 23.352Q18.464 23.264 20.048000000000002 24.716M15.78 23.352Q15.912 25.64 13.668 26.740000000000002" strokeWidth="1.25" /><Path d="M16 15V12Q16 7 10 7M16 12Q16 7 22 7" strokeWidth="2.7" /><Circle cx="6" cy="7" r="2.8" strokeWidth="2.7" fill="currentColor" stroke="none" /><Circle cx="26" cy="7" r="2.8" strokeWidth="2.7" fill="currentColor" stroke="none" /></G>,
);
export const IconLibero = icon(
  <G fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 8Q16 3 27 8V15Q26 23 16 28Q6 23 5 15Z" strokeWidth="2.7" /><Path d="M17 5.7Q9.5 11 14 16Q20 15 25.5 20M14 16Q16 22 12 25.5" strokeWidth="2.4" /></G>,
);
export const IconLista = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="6" cy="8" r="2" fill="currentColor" stroke="none" /><Circle cx="6" cy="16" r="2" fill="currentColor" stroke="none" /><Circle cx="6" cy="24" r="2" fill="currentColor" stroke="none" /><Path d="M13 8H27M13 16H27M13 24H27" /></G>,
);
export const IconLocal = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M26 13C26 20 16 29 16 29S6 20 6 13A10 10 0 0 1 26 13Z" /><Circle cx="16" cy="13" r="3.8" /></G>,
);
export const IconMaisOpcoes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="6" cy="16" r="2.5" fill="currentColor" stroke="none" /><Circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none" /><Circle cx="26" cy="16" r="2.5" fill="currentColor" stroke="none" /></G>,
);
export const IconModalidade = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 26V13M26 26V13M6 15Q16 18 26 15M6 23Q16 20 26 23" /><Circle cx="16" cy="6.5" r="3.2" fill="currentColor" stroke="none" /></G>,
);
export const IconMontarTimes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="4" y="6" width="9" height="9" rx="2" /><Rect x="19" y="17" width="9" height="9" rx="2" /><Path d="M19 7H28M24 3 28 7 24 11M13 25H4M8 21 4 25 8 29" /></G>,
);
export const IconMvp = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 3 20 11 29 12 22 19 24 28 16 24 8 28 10 19 3 12 12 11Z" /></G>,
);
export const IconNivel = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 26V20H12V13H19V6H27V26Z" /></G>,
);
export const IconNotificacoes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M7 15C7 10 8.7 5 16 5S25 10 25 15C25 19 27 20 28 23H4C5 20 7 19 7 15ZM13 28Q16 31 19 28" /></G>,
);
export const IconOposto = icon(
  <G fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><Path d="M12.6 23.5 4 5Q3.5 3.5 5 4L23.5 12.6" strokeWidth="2.7" /><Circle cx="20" cy="20" r="8" strokeWidth="2.5" /><Path d="M21.44 12.16Q16.16 17.6 19.6 20.64Q24.48 20.48 27.36 23.12M19.6 20.64Q19.84 24.8 15.76 26.8" strokeWidth="1.6" /></G>,
);
export const IconParque = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 4C11 1 7 5 7 10C1 12 3 20 9 21H23C30 21 31 12 25 10C25 5 21 2 16 4ZM16 21V28M11 28H21" /></G>,
);
export const IconParticipantes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="12" cy="10" r="4.5" /><Path d="M3 27V24C3 18 21 18 21 24V27ZM23 6C29 6 29 14 23 14M26 20C29 21 29 23 29 27" /></G>,
);
export const IconPartida = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><G strokeWidth="2.7"><Circle cx="16" cy="16" r="12" /><Path d="M14.56 4.48 Q10.0 14.56 16 16 Q24.16 16.48 25.96 22.6 M16 16 Q13.84 24.64 7.0 23.92" strokeWidth="1.9" /></G></G>,
);
export const IconPerfil = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="10" r="5" /><Path d="M5 28V25C5 18 27 18 27 25V28Z" /></G>,
);
export const IconPermissoes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M21 12V5H6V27H14M11 9H16M23 14 29 17V21Q28 26 23 28Q18 26 17 21V17Z" strokeWidth="2.6" /></G>,
);
export const IconPonteiro = icon(
  <G fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 25C4 15 13 7 28 4L21 13H26L19 21H23L16 27H6Q4 27 4 25Z" strokeWidth="2.7" /></G>,
);
export const IconPontos = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 3C18 10 25 11 26 19C28 32 5 32 6 19C6 15 9 12 11 10C11 16 16 16 16 3Z" /><Path d="M16 18C21 22 18 27 15 26C12 25 13 21 16 18Z" fill="currentColor" stroke="none" /></G>,
);
export const IconPrivacidade = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 8Q16 3 27 8V15Q26 23 16 27Q6 23 5 15Z" strokeWidth="2.9" /><Path d="M13 16 16 19 21 13" strokeWidth="2.5" /></G>,
);
export const IconPrivado = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="5.5" y="13" width="21" height="14" rx="4" /><Path d="M10 13V10C10 2 22 2 22 10V13" /><Circle cx="16" cy="20" r="2" fill="currentColor" stroke="none" /></G>,
);
export const IconProblema = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M14 5Q16 2 18 5L29 25Q30 28 27 28H5Q2 28 3 25Z" /><Path d="M16 11V18" strokeWidth="3" /><Circle cx="16" cy="23" r="1.5" fill="currentColor" stroke="none" /></G>,
);
export const IconProximoSet = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 7 21 16 6 25ZM26 7V25" /></G>,
);
export const IconQuadra = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="7" width="26" height="18" rx="2.5" /><Path d="M16 7V25M10 7V25M22 7V25" strokeWidth="2.1" /></G>,
);
export const IconRanking = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M3 28V18H11V8H21V14H29V28ZM11 18V28M21 14V28" /><Circle cx="16" cy="3" r="1.7" fill="currentColor" stroke="none" /></G>,
);
export const IconRateio = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="6" y="4" width="20" height="10" rx="2" /><Circle cx="16" cy="9" r="2" fill="currentColor" stroke="none" /><Path d="M16 14V19M6 24V21H26V24M16 19V24" /></G>,
);
export const IconRecolher = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M7 20 16 11 25 20" strokeWidth="3.2" /></G>,
);
export const IconRecorrente = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M26 12C24 5 15 2 8 8L4 12M4 5V12H11M6 20C8 27 17 30 24 24L28 20M28 27V20H21" /></G>,
);
export const IconRede = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M5 5V27M27 5V27M5 9Q16 12 27 9M5 21Q16 18 27 21" strokeWidth="2.9" /><Circle cx="20" cy="7" r="3.2" fill="currentColor" stroke="none" /><Circle cx="13" cy="20" r="3.7" fill="currentColor" stroke="none" /></G>,
);
export const IconResumo = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M10 7H6V27H26V7H22M11 4H21V10H11ZM11 17H21M11 22H18" /></G>,
);
export const IconRota = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 13 28 4 19 28 15 18Z" /></G>,
);
export const IconSair = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M13 5H5V27H13M11 16H28M22 10 28 16 22 22" /></G>,
);
export const IconSalvadas = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="10" r="4.5" fill="currentColor" stroke="none" /><Path d="M5 19C7 25 25 25 27 19" strokeWidth="3.2" /></G>,
);
export const IconSobre = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="16" r="12" /><Circle cx="16" cy="9" r="1.7" fill="currentColor" stroke="none" /><Path d="M14 15H16V24M13 24H19" /></G>,
);
export const IconSortearTimes = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 7H7C13 7 19 25 25 25H28M23 20 28 25 23 30M4 25H7C10 25 12 22 14 19M19 12C21 9 23 7 25 7H28M23 2 28 7 23 12" /></G>,
);
export const IconSubir = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 27V5M8 13 16 5 24 13" /></G>,
);
export const IconSugestao = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M11 22V19C4 14 8 5 16 5S28 14 21 19V22ZM12 27H20" /></G>,
);
export const IconTermos = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M7 5H20L26 11V27H7ZM20 5V11H26M12 18H21M12 23H18" /></G>,
);
export const IconTour = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Circle cx="16" cy="16" r="11.5" /><Path d="M22 9 18 18 10 23 14 14Z" /></G>,
);
export const IconTrofeu = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M9 4H23V12C23 22 9 22 9 12ZM9 8H4V13Q4 17 10 17M23 8H28V13Q28 17 22 17M16 20V27M10 28H22" /></G>,
);
export const IconVaga = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M4 6H28V12C21 12 21 20 28 20V26H4V20C11 20 11 12 4 12Z" /><Path d="M16 11V21M11 16H21" strokeWidth="2.3" /></G>,
);
export const IconValor = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="7" width="26" height="18" rx="4" /><Circle cx="16" cy="16" r="4" /><Path d="M7 12H8M24 20H25" /></G>,
);
export const IconVirarCarta = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Rect x="10" y="6" width="13" height="20" rx="2" /><Path d="M6 11C2 16 4 21 7 23M3 23H7V19M27 21C30 16 28 11 25 9M29 9H25V13" strokeWidth="2.4" /></G>,
);
export const IconVoltar = icon(
  <G fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M20 7 11 16 20 25" strokeWidth="3.2" /></G>,
);
export const IconCurtirAtivo = icon(
  <G fill="currentColor" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><Path d="M16 27C10 23 4 18 4 11A6.6 6.6 0 0 1 16 7A6.6 6.6 0 0 1 28 11C28 18 22 23 16 27Z" /></G>,
);
