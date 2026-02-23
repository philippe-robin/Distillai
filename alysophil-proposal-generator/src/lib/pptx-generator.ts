// ---------------------------------------------------------------------------
// pptx-generator.ts
// Generates an Alysophil-branded PowerPoint proposal from ProposalData.
// ---------------------------------------------------------------------------

import PptxGenJS from 'pptxgenjs';
import type { ProposalData, Language, TechSpec, WorkPackage } from './types';
import {
  logo_alysophil,
  qspr_diagram,
  reverse_qspr,
  training_model,
  polymer_multiscale,
  back_cover,
} from '../assets/images/index';

// ---------------------------------------------------------------------------
// Constants - Template design tokens
// ---------------------------------------------------------------------------

const COLORS = {
  yellow: 'FBB900',
  darkBlue: '1B1A2A',
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  gray: 'E7E6E6',
  lightGray: 'F5F5F5',
  green: '00B050',
  orange: 'FFC000',
  mediumGray: 'BFBFBF',
} as const;

const FONTS = {
  titleBlack: 'Avenir Black',
  body: 'Avenir Book',
  light: 'Avenir Light',
  medium: 'Avenir Medium',
} as const;

const SLIDE = {
  width: 13.33,
  height: 7.5,
} as const;

// ---------------------------------------------------------------------------
// i18n - Inline slide texts
// ---------------------------------------------------------------------------

const i18n: Record<string, Record<Language, string>> = {
  // Cover
  coverProposalTo: {
    en: 'Work proposal to',
    fr: 'Proposition de travail pour',
  },
  coverFor: { en: 'for', fr: 'pour' },
  coverValidity: { en: 'Validity:', fr: 'Validite :' },
  coverReference: { en: 'Reference:', fr: 'Reference :' },

  // Section titles
  sectionContextNeed: { en: 'Context / Need', fr: 'Contexte / Besoin' },
  titleContext: { en: 'Context', fr: 'Contexte' },
  titleTechSpecs: {
    en: 'Technical specifications',
    fr: 'Cahier des charges',
  },
  titlePrediction: {
    en: 'How we predict molecular properties',
    fr: 'Comment nous predisons les proprietes moleculaires',
  },
  titleChallenges: {
    en: 'Challenges in transposing QSPR method',
    fr: 'Defis de la transposition de la methode QSPR',
  },
  titleEncouraging: {
    en: 'Encouraging initial research',
    fr: 'Resultats de recherche encourageants',
  },
  titlePosition: {
    en: "Alysophil's position",
    fr: "Position d'Alysophil",
  },
  titleStudyContent: { en: 'Study content', fr: "Contenu de l'etude" },
  titleResources: {
    en: 'Resources & deliverables',
    fr: 'Ressources & livrables',
  },
  titlePlanning: { en: 'Planning', fr: 'Planning' },
  titleBudget: { en: 'Budget', fr: 'Budget' },

  // Tech specs
  techSpecsIntro: {
    en: 'provided Alysophil with specifications for the ideal product.',
    fr: "a fourni a Alysophil un cahier des charges pour le produit ideal.",
  },
  techSpecsNote: {
    en: 'Alysophil will adapt its methodologies to best meet these specifications.',
    fr: 'Alysophil adaptera ses methodologies pour repondre au mieux a ce cahier des charges.',
  },

  // Prediction slides
  predictionSubtitle: {
    en: 'QSp/aR - Quantitative Structure property/activity Relationship',
    fr: 'QSp/aR - Quantitative Structure property/activity Relationship',
  },
  predictionExplanation: {
    en: 'QSPR/QSAR methods establish mathematical relationships between the molecular structure of chemical compounds and their physical, chemical, or biological properties. By encoding structural features as numerical descriptors, machine learning models can predict target properties from structure alone.',
    fr: "Les methodes QSPR/QSAR etablissent des relations mathematiques entre la structure moleculaire des composes chimiques et leurs proprietes physiques, chimiques ou biologiques. En encodant les caracteristiques structurelles sous forme de descripteurs numeriques, les modeles d'apprentissage automatique peuvent predire les proprietes cibles a partir de la seule structure.",
  },
  trainingModelsTitle: {
    en: 'Training models to predict from structure',
    fr: 'Entrainement de modeles predictifs',
  },
  reverseQsprTitle: { en: 'Reverse QSPR', fr: 'QSPR inverse' },
  inputLabel: { en: 'Input', fr: 'Entree' },
  outputLabel: { en: 'Output', fr: 'Sortie' },
  structureLabel: { en: 'Molecular structure', fr: 'Structure moleculaire' },
  propertiesLabel: { en: 'Target properties', fr: 'Proprietes cibles' },

  // Challenges
  challengeCaption: {
    en: 'Multi-scale complexity in polymer systems',
    fr: 'Complexite multi-echelle dans les systemes polymeres',
  },

  // Position slide
  legendWillPredict: {
    en: 'Will be predicted',
    fr: 'Sera predit',
  },
  legendIfProgress: {
    en: 'If progress allows',
    fr: 'Si les avancees le permettent',
  },
  legendNotFeasible: {
    en: 'Not feasible at this stage',
    fr: 'Non faisable a ce stade',
  },

  // Study content
  objectiveLabel: { en: 'Objective:', fr: 'Objectif :' },
  durationLabel: { en: 'Duration:', fr: 'Duree :' },
  weeksLabel: { en: 'weeks', fr: 'semaines' },

  // Resources
  definitionRoles: {
    en: 'Definition of roles',
    fr: 'Definition des roles',
  },
  roleColumn: { en: 'Role', fr: 'Role' },
  contactColumn: { en: 'Contact', fr: 'Contact' },
  deliverablesTitle: { en: 'Deliverables', fr: 'Livrables' },

  // Planning
  planningIntro: {
    en: 'A total of {weeks} weeks is planned for this project.',
    fr: 'Un total de {weeks} semaines est prevu pour ce projet.',
  },
  weekAbbr: { en: 'W', fr: 'S' },

  // Budget
  budgetWeeks: { en: '{n} weeks', fr: '{n} semaines' },
  budgetFTE: { en: '{n} FTE', fr: '{n} ETP' },
  budgetDailyRate: {
    en: 'Daily rate: {rate} EUR/day/FTE',
    fr: 'Taux journalier : {rate} EUR/jour/ETP',
  },
  budgetTotal: { en: 'Total:', fr: 'Total :' },
  budgetSubject: { en: 'Subject', fr: 'Objet' },
  budgetUnitPrice: { en: 'Unit Price', fr: 'Prix unitaire' },
  budgetQty: { en: 'Qty', fr: 'Qte' },
  budgetTotalCol: { en: 'Total', fr: 'Total' },
  budgetStudy: { en: 'QSPR Study', fr: 'Etude QSPR' },
  budgetTotalHT: { en: 'Total excl. VAT', fr: 'Total HT' },
  budgetVAT: { en: 'VAT {rate}%', fr: 'TVA {rate}%' },
  budgetTotalTTC: { en: 'Total incl. VAT', fr: 'Total TTC' },
  budgetPaymentTerms: {
    en: 'Payment terms: 50% at signature, 50% at delivery of results.',
    fr: 'Conditions de paiement : 50% a la signature, 50% a la livraison des resultats.',
  },

  // Footer
  confidentialFooter: {
    en: 'Confidential - Property of Alysophil - Reproduction prohibited',
    fr: 'Confidentiel - Propriete Alysophil - Reproduction interdite',
  },
};

/** Shorthand to get translated string. */
function t(key: string, lang: Language): string {
  return i18n[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Helper: format currency
// ---------------------------------------------------------------------------

function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Shared slide helpers
// ---------------------------------------------------------------------------

type Slide = ReturnType<PptxGenJS['addSlide']>;

/** Add the red confidential footer to a slide. */
function addConfidentialFooter(slide: Slide, lang: Language): void {
  slide.addText(t('confidentialFooter', lang), {
    x: 0.5,
    y: 7.0,
    w: 12.33,
    h: 0.35,
    fontSize: 10.5,
    fontFace: FONTS.body,
    bold: true,
    color: COLORS.red,
    align: 'center',
    valign: 'bottom',
  });
}

/** Add a standard slide title bar. */
function addSlideTitle(
  slide: Slide,
  title: string,
  opts?: { fontSize?: number; y?: number; w?: number }
): void {
  const fontSize = opts?.fontSize ?? 36;
  const y = opts?.y ?? 0.2;
  const w = opts?.w ?? 12;

  // Yellow accent line under title
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.5,
    y: y + 0.65,
    w: 1.2,
    h: 0.06,
    fill: { color: COLORS.yellow },
  });

  slide.addText(title, {
    x: 0.5,
    y,
    w,
    h: 0.7,
    fontSize,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
  });
}

/** Add small Alysophil logo in top-right corner. (501x300, ratio 1.67:1) */
function addCornerLogo(slide: Slide): void {
  slide.addImage({
    data: logo_alysophil,
    x: 11.0,
    y: 0.1,
    w: 2.0,
    h: 1.2, // 2.0 / 1.67 = 1.20 preserves aspect ratio
    sizing: { type: 'contain', w: 2.0, h: 1.2 },
  });
}

/** Compute total budget (weeks * 5 days * FTE * daily rate). */
function computeTotalBudget(data: ProposalData): number {
  const { dailyRate, fteCount, totalWeeks } = data.budget;
  return totalWeeks * 5 * fteCount * dailyRate;
}

// ---------------------------------------------------------------------------
// Feasibility color map
// ---------------------------------------------------------------------------

function feasibilityColor(f: TechSpec['feasibility']): string {
  switch (f) {
    case 'green':
      return COLORS.green;
    case 'yellow':
      return COLORS.orange;
    case 'red':
      return COLORS.red;
    default:
      return COLORS.mediumGray;
  }
}

// ---------------------------------------------------------------------------
// Slide builders
// ---------------------------------------------------------------------------

function buildCoverSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  // Background
  slide.background = { color: COLORS.white };

  // Left yellow gradient area (stacked rectangles to simulate gradient)
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0,
    y: 0,
    w: 0.35,
    h: SLIDE.height,
    fill: { color: COLORS.yellow },
  });
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.35,
    y: 0,
    w: 0.15,
    h: SLIDE.height,
    fill: { color: COLORS.yellow, transparency: 30 },
  });
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.5,
    y: 0,
    w: 0.1,
    h: SLIDE.height,
    fill: { color: COLORS.yellow, transparency: 60 },
  });

  // Title text
  const actionVerb = lang === 'fr' ? 'developper des solutions' : 'develop solutions';
  const titleText = `${t('coverProposalTo', lang)} ${actionVerb}\n${t('coverFor', lang)} ${data.client.name}`;
  slide.addText(titleText, {
    x: 1.0,
    y: 1.5,
    w: 7.0,
    h: 2.2,
    fontSize: 20,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
    lineSpacingMultiple: 1.3,
  });

  // Date below title
  slide.addText(data.client.date, {
    x: 1.0,
    y: 3.7,
    w: 5.0,
    h: 0.5,
    fontSize: 16,
    fontFace: FONTS.light,
    italic: true,
    color: COLORS.darkBlue,
  });

  // Logo on right side (501x300, ratio 1.67:1)
  slide.addImage({
    data: logo_alysophil,
    x: 9.0,
    y: 0.6,
    w: 3.5,
    h: 2.1, // 3.5 / 1.67 = 2.10 to preserve aspect ratio
    sizing: { type: 'contain', w: 3.5, h: 2.1 },
  });

  // Decorative rectangles bottom-right
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 10.0,
    y: 5.5,
    w: 3.33,
    h: 0.15,
    fill: { color: COLORS.yellow },
  });
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 10.5,
    y: 5.7,
    w: 2.83,
    h: 0.1,
    fill: { color: COLORS.darkBlue },
  });

  // Client name box (yellow rectangle bottom-right)
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 8.8,
    y: 5.0,
    w: 4.0,
    h: 0.7,
    fill: { color: COLORS.yellow },
    rectRadius: 0.05,
  });
  slide.addText(data.client.name, {
    x: 8.8,
    y: 5.0,
    w: 4.0,
    h: 0.7,
    fontSize: 16,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
    align: 'center',
    valign: 'middle',
  });

  // Validity
  slide.addText(`${t('coverValidity', lang)} ${data.client.validity}`, {
    x: 0.8,
    y: 6.2,
    w: 4.0,
    h: 0.35,
    fontSize: 10,
    fontFace: FONTS.body,
    color: COLORS.darkBlue,
  });

  // Reference
  slide.addText(`${t('coverReference', lang)} ${data.client.reference}`, {
    x: 0.8,
    y: 6.5,
    w: 4.0,
    h: 0.35,
    fontSize: 10,
    fontFace: FONTS.body,
    color: COLORS.darkBlue,
  });

  addConfidentialFooter(slide, lang);
}

function buildSectionSlide(pptx: PptxGenJS, data: ProposalData, titleKey: string): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };

  // Large centered section title
  slide.addText(t(titleKey, lang), {
    x: 0,
    y: 2.5,
    w: SLIDE.width,
    h: 1.5,
    fontSize: 44,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
    align: 'center',
    valign: 'middle',
  });

  // Yellow accent line below
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 5.5,
    y: 4.1,
    w: 2.33,
    h: 0.08,
    fill: { color: COLORS.yellow },
  });

  addCornerLogo(slide);
  addConfidentialFooter(slide, lang);
}

function buildContextSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titleContext', lang));

  // Context body in a rounded rectangle
  slide.addShape('roundRect' as PptxGenJS.ShapeType, {
    x: 0.5,
    y: 1.2,
    w: 12.33,
    h: 5.2,
    fill: { color: COLORS.lightGray },
    rectRadius: 0.15,
    line: { color: COLORS.gray, width: 1 },
  });

  slide.addText(data.context || data.need || '', {
    x: 0.8,
    y: 1.4,
    w: 11.73,
    h: 4.8,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.black,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    align: 'justify' as any,
    valign: 'top',
    lineSpacingMultiple: 1.3,
    wrap: true,
  });

  addConfidentialFooter(slide, lang);
}

function buildTechSpecsSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titleTechSpecs', lang));

  // Subtitle
  slide.addText(`${data.client.name} ${t('techSpecsIntro', lang)}`, {
    x: 0.5,
    y: 1.1,
    w: 12.0,
    h: 0.5,
    fontSize: 16,
    fontFace: FONTS.body,
    color: COLORS.darkBlue,
  });

  // Specs list with checkboxes
  const includedSpecs = data.techSpecs.filter((s) => s.included);
  const specLines: PptxGenJS.TextProps[] = includedSpecs.map((spec) => ({
    text: `  \u2751  ${spec.text}`,
    options: {
      fontSize: 14,
      fontFace: FONTS.body,
      color: COLORS.black,
      bullet: false,
      lineSpacingMultiple: 1.5,
      breakType: 'none' as const,
    },
  }));

  if (specLines.length > 0) {
    slide.addText(specLines, {
      x: 0.8,
      y: 1.8,
      w: 11.5,
      h: 4.2,
      valign: 'top',
      wrap: true,
    });
  }

  // Bottom note
  slide.addText(
    [
      {
        text: t('techSpecsNote', lang),
        options: {
          fontSize: 13,
          fontFace: FONTS.body,
          bold: true,
          color: COLORS.darkBlue,
          italic: true,
        },
      },
    ],
    {
      x: 0.5,
      y: 6.1,
      w: 12.0,
      h: 0.6,
      valign: 'top',
    }
  );

  addConfidentialFooter(slide, lang);
}

function buildPredictionSlide1(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titlePrediction', lang), { fontSize: 32 });

  // Subtitle
  slide.addText(t('predictionSubtitle', lang), {
    x: 0.5,
    y: 1.0,
    w: 12.0,
    h: 0.6,
    fontSize: 20,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.yellow,
  });

  // Explanation text
  const explanationText =
    data.methodology.predictionDescription || t('predictionExplanation', lang);
  slide.addText(explanationText, {
    x: 0.5,
    y: 1.7,
    w: 6.5,
    h: 4.5,
    fontSize: 14,
    fontFace: FONTS.light,
    color: COLORS.black,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    align: 'justify' as any,
    valign: 'top',
    lineSpacingMultiple: 1.3,
    wrap: true,
  });

  // QSPR diagram image on right (2128x783 → wide format, maintain aspect ratio)
  slide.addImage({
    data: qspr_diagram,
    x: 7.3,
    y: 2.0,
    w: 5.5,
    h: 2.02, // 5.5 * (783/2128) to preserve aspect ratio
    sizing: { type: 'contain', w: 5.5, h: 2.02 },
  });

  addConfidentialFooter(slide, lang);
}

function buildPredictionSlide2(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titlePrediction', lang), { fontSize: 32 });

  // Two columns
  const colLeftX = 0.5;
  const colRightX = 7.0;
  const colW = 5.8;

  // Left column: Training models
  slide.addText(t('trainingModelsTitle', lang), {
    x: colLeftX,
    y: 1.1,
    w: colW,
    h: 0.5,
    fontSize: 16,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
    align: 'center',
  });

  slide.addImage({
    data: training_model,
    x: colLeftX + 0.3,
    y: 1.8,
    w: 5.2,
    h: 3.68, // 5.2 * (744/1052) = 3.68 preserves aspect ratio
    sizing: { type: 'contain', w: 5.2, h: 3.68 },
  });

  // Input/Output labels left
  slide.addText(`${t('inputLabel', lang)}: ${t('structureLabel', lang)}`, {
    x: colLeftX,
    y: 5.4,
    w: colW,
    h: 0.35,
    fontSize: 11,
    fontFace: FONTS.medium,
    color: COLORS.darkBlue,
    align: 'center',
  });
  slide.addText(`${t('outputLabel', lang)}: ${t('propertiesLabel', lang)}`, {
    x: colLeftX,
    y: 5.75,
    w: colW,
    h: 0.35,
    fontSize: 11,
    fontFace: FONTS.medium,
    color: COLORS.darkBlue,
    align: 'center',
  });

  // Vertical separator
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 6.6,
    y: 1.2,
    w: 0.04,
    h: 5.0,
    fill: { color: COLORS.gray },
  });

  // Right column: Reverse QSPR
  slide.addText(t('reverseQsprTitle', lang), {
    x: colRightX,
    y: 1.1,
    w: colW,
    h: 0.5,
    fontSize: 16,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
    align: 'center',
  });

  slide.addImage({
    data: reverse_qspr,
    x: colRightX + 0.9,
    y: 1.8,
    w: 3.5,
    h: 3.57, // 3.5 * (434/426) = 3.57 preserves aspect ratio (nearly square image)
    sizing: { type: 'contain', w: 3.5, h: 3.57 },
  });

  // Input/Output labels right (reversed)
  slide.addText(`${t('inputLabel', lang)}: ${t('propertiesLabel', lang)}`, {
    x: colRightX,
    y: 5.4,
    w: colW,
    h: 0.35,
    fontSize: 11,
    fontFace: FONTS.medium,
    color: COLORS.darkBlue,
    align: 'center',
  });
  slide.addText(`${t('outputLabel', lang)}: ${t('structureLabel', lang)}`, {
    x: colRightX,
    y: 5.75,
    w: colW,
    h: 0.35,
    fontSize: 11,
    fontFace: FONTS.medium,
    color: COLORS.darkBlue,
    align: 'center',
  });

  addConfidentialFooter(slide, lang);
}

function buildChallengesSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titleChallenges', lang), { fontSize: 30 });

  // Challenges description text (left area)
  const challengesText =
    data.methodology.challengesDescription ||
    (lang === 'fr'
      ? "1. La complexite multi-echelle des systemes polymeres rend la modelisation plus difficile que pour les petites molecules.\n\n2. Les donnees experimentales disponibles sont souvent limitees et heterogenes, ce qui complique l'entrainement des modeles."
      : '1. The multi-scale complexity of polymer systems makes modeling more challenging than for small molecules.\n\n2. Available experimental data is often limited and heterogeneous, complicating model training.');

  slide.addText(challengesText, {
    x: 0.5,
    y: 1.2,
    w: 7.0,
    h: 4.8,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.black,
    valign: 'top',
    lineSpacingMultiple: 1.4,
    wrap: true,
  });

  // Polymer multiscale image on right (3226x1572, ratio 2.05:1)
  slide.addImage({
    data: polymer_multiscale,
    x: 7.8,
    y: 1.8,
    w: 5.0,
    h: 2.44, // 5.0 / 2.05 = 2.44 preserves aspect ratio
    sizing: { type: 'contain', w: 5.0, h: 2.44 },
  });

  // Caption below image
  slide.addText(t('challengeCaption', lang), {
    x: 7.8,
    y: 5.4,
    w: 5.0,
    h: 0.4,
    fontSize: 10,
    fontFace: FONTS.light,
    italic: true,
    color: COLORS.mediumGray,
    align: 'center',
  });

  addConfidentialFooter(slide, lang);
}

function buildEncouragingSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titleEncouraging', lang));

  // Italic intro
  const introText =
    lang === 'fr'
      ? `Alysophil a mene des recherches initiales sur le sujet ${data.client.name}...`
      : `Alysophil conducted initial research on the ${data.client.name} subject...`;

  slide.addText(introText, {
    x: 0.5,
    y: 1.2,
    w: 12.0,
    h: 0.5,
    fontSize: 14,
    fontFace: FONTS.body,
    italic: true,
    color: COLORS.darkBlue,
  });

  // Encouraging research content
  const researchText =
    data.methodology.encouragingResearch ||
    (lang === 'fr'
      ? "1. Les premiers modeles QSPR entraines sur des donnees publiques montrent des resultats prometteurs.\n\n2. Les methodes de generation inverse ont permis d'identifier des structures candidates interessantes."
      : '1. Initial QSPR models trained on public data show promising results.\n\n2. Reverse generation methods have identified interesting candidate structures.');

  slide.addText(researchText, {
    x: 0.5,
    y: 1.9,
    w: 12.0,
    h: 3.5,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.black,
    valign: 'top',
    lineSpacingMultiple: 1.4,
    wrap: true,
  });

  // Bold conclusion
  const conclusionText =
    lang === 'fr'
      ? "Ces resultats encourageants justifient la construction d'un programme de recherche structure."
      : 'These encouraging results justify building a structured research program.';

  slide.addText(conclusionText, {
    x: 0.5,
    y: 5.6,
    w: 12.0,
    h: 0.6,
    fontSize: 14,
    fontFace: FONTS.body,
    bold: true,
    color: COLORS.darkBlue,
  });

  addConfidentialFooter(slide, lang);
}

function buildPositionSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titlePosition', lang));

  // Position text
  const positionText =
    data.methodology.position ||
    (lang === 'fr'
      ? "Alysophil propose d'appliquer son expertise en QSPR pour repondre au cahier des charges."
      : 'Alysophil proposes to apply its QSPR expertise to meet the specifications.');

  slide.addText(positionText, {
    x: 0.5,
    y: 1.2,
    w: 12.0,
    h: 1.0,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.black,
    valign: 'top',
    lineSpacingMultiple: 1.3,
    wrap: true,
  });

  // Two columns of specs with feasibility color coding
  const specs = data.techSpecs.filter((s) => s.included);
  const midpoint = Math.ceil(specs.length / 2);
  const leftSpecs = specs.slice(0, midpoint);
  const rightSpecs = specs.slice(midpoint);

  const renderSpecColumn = (
    columnSpecs: TechSpec[],
    startX: number,
    startY: number,
    colWidth: number
  ) => {
    columnSpecs.forEach((spec, idx) => {
      const yPos = startY + idx * 0.45;

      // Colored checkbox
      slide.addShape('rect' as PptxGenJS.ShapeType, {
        x: startX,
        y: yPos + 0.05,
        w: 0.22,
        h: 0.22,
        fill: { color: feasibilityColor(spec.feasibility) },
        line: { color: feasibilityColor(spec.feasibility), width: 1 },
      });

      // Spec text
      slide.addText(spec.text, {
        x: startX + 0.35,
        y: yPos,
        w: colWidth - 0.5,
        h: 0.35,
        fontSize: 12,
        fontFace: FONTS.body,
        color: COLORS.black,
        valign: 'middle',
      });
    });
  };

  renderSpecColumn(leftSpecs, 0.5, 2.4, 6.0);
  renderSpecColumn(rightSpecs, 6.8, 2.4, 6.0);

  // Legend box at bottom right
  const legendY = 5.8;
  const legendX = 8.5;

  // Green legend
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: legendX,
    y: legendY,
    w: 0.18,
    h: 0.18,
    fill: { color: COLORS.green },
  });
  slide.addText(t('legendWillPredict', lang), {
    x: legendX + 0.25,
    y: legendY - 0.03,
    w: 2.5,
    h: 0.25,
    fontSize: 9,
    fontFace: FONTS.light,
    color: COLORS.black,
  });

  // Yellow legend
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: legendX,
    y: legendY + 0.3,
    w: 0.18,
    h: 0.18,
    fill: { color: COLORS.orange },
  });
  slide.addText(t('legendIfProgress', lang), {
    x: legendX + 0.25,
    y: legendY + 0.27,
    w: 2.5,
    h: 0.25,
    fontSize: 9,
    fontFace: FONTS.light,
    color: COLORS.black,
  });

  // Red legend
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: legendX,
    y: legendY + 0.6,
    w: 0.18,
    h: 0.18,
    fill: { color: COLORS.red },
  });
  slide.addText(t('legendNotFeasible', lang), {
    x: legendX + 0.25,
    y: legendY + 0.57,
    w: 2.5,
    h: 0.25,
    fontSize: 9,
    fontFace: FONTS.light,
    color: COLORS.black,
  });

  addConfidentialFooter(slide, lang);
}

function buildStudyContentSlide(
  pptx: PptxGenJS,
  data: ProposalData,
  wp: WorkPackage,
  wpIndex: number
): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titleStudyContent', lang), { fontSize: 32 });

  // WP title with duration
  const wpTitle = `WP${wpIndex + 1}: ${wp.title}`;
  const wpDuration = `${wp.durationWeeks} ${t('weeksLabel', lang)}`;

  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0.5,
    y: 1.15,
    w: 12.33,
    h: 0.55,
    fill: { color: COLORS.yellow },
    rectRadius: 0.05,
  });

  slide.addText(wpTitle, {
    x: 0.7,
    y: 1.15,
    w: 9.0,
    h: 0.55,
    fontSize: 16,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
    valign: 'middle',
  });

  slide.addText(`${t('durationLabel', lang)} ${wpDuration}`, {
    x: 9.8,
    y: 1.15,
    w: 3.0,
    h: 0.55,
    fontSize: 14,
    fontFace: FONTS.medium,
    color: COLORS.darkBlue,
    align: 'right',
    valign: 'middle',
  });

  // Content box
  slide.addShape('roundRect' as PptxGenJS.ShapeType, {
    x: 0.5,
    y: 1.9,
    w: 12.33,
    h: 4.6,
    fill: { color: COLORS.lightGray },
    rectRadius: 0.1,
    line: { color: COLORS.gray, width: 1 },
  });

  // Objective
  slide.addText(
    [
      {
        text: `${t('objectiveLabel', lang)} `,
        options: {
          fontSize: 13,
          fontFace: FONTS.titleBlack,
          bold: true,
          color: COLORS.darkBlue,
        },
      },
      {
        text: wp.objective,
        options: {
          fontSize: 13,
          fontFace: FONTS.body,
          color: COLORS.black,
        },
      },
    ],
    {
      x: 0.8,
      y: 2.1,
      w: 11.73,
      h: 0.5,
      valign: 'top',
      wrap: true,
    }
  );

  // Description
  slide.addText(wp.description, {
    x: 0.8,
    y: 2.8,
    w: 11.73,
    h: 2.0,
    fontSize: 13,
    fontFace: FONTS.body,
    color: COLORS.black,
    valign: 'top',
    lineSpacingMultiple: 1.3,
    wrap: true,
  });

  // Deliverables as bullet points
  if (wp.deliverables.length > 0) {
    const bulletTexts: PptxGenJS.TextProps[] = wp.deliverables.map((d) => ({
      text: d,
      options: {
        fontSize: 12,
        fontFace: FONTS.body,
        color: COLORS.black,
        bullet: { type: 'bullet' as const },
        lineSpacingMultiple: 1.3,
      },
    }));

    slide.addText(bulletTexts, {
      x: 0.8,
      y: 4.9,
      w: 11.73,
      h: 1.4,
      valign: 'top',
      wrap: true,
    });
  }

  addConfidentialFooter(slide, lang);
}

function buildResourcesSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titleResources', lang), { fontSize: 32 });

  // "Definition of roles" subtitle
  slide.addText(t('definitionRoles', lang), {
    x: 0.5,
    y: 1.1,
    w: 8.0,
    h: 0.45,
    fontSize: 18,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
  });

  // Roles table
  type TableRow = PptxGenJS.TableRow;

  const headerRow: TableRow = [
    {
      text: t('roleColumn', lang),
      options: {
        fontSize: 13,
        fontFace: FONTS.titleBlack,
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.darkBlue },
        valign: 'middle',
        align: 'center',
      },
    },
    {
      text: t('contactColumn', lang),
      options: {
        fontSize: 13,
        fontFace: FONTS.titleBlack,
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.darkBlue },
        valign: 'middle',
        align: 'center',
      },
    },
  ];

  const dataRows: TableRow[] = data.team.map((member) => [
    {
      text: `${member.role}\n${member.name}`,
      options: {
        fontSize: 12,
        fontFace: FONTS.body,
        color: COLORS.black,
        valign: 'middle' as const,
        fill: { color: COLORS.lightGray },
      },
    },
    {
      text: member.contact,
      options: {
        fontSize: 12,
        fontFace: FONTS.body,
        color: COLORS.black,
        valign: 'middle' as const,
        fill: { color: COLORS.lightGray },
      },
    },
  ]);

  slide.addTable([headerRow, ...dataRows], {
    x: 0.5,
    y: 1.7,
    w: 12.33,
    colW: [4.0, 8.33],
    rowH: 0.5,
    border: { pt: 0.5, color: COLORS.mediumGray },
  });

  // Deliverables section
  const tableEndY = 1.7 + 0.5 * (data.team.length + 1) + 0.3;

  slide.addText(t('deliverablesTitle', lang), {
    x: 0.5,
    y: tableEndY,
    w: 8.0,
    h: 0.45,
    fontSize: 18,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.darkBlue,
  });

  const delivBullets: PptxGenJS.TextProps[] = data.deliverables.map((d) => ({
    text: `${d.title} (${d.format})`,
    options: {
      fontSize: 13,
      fontFace: FONTS.body,
      color: COLORS.black,
      bullet: { type: 'bullet' as const },
      lineSpacingMultiple: 1.5,
    },
  }));

  slide.addText(delivBullets, {
    x: 0.8,
    y: tableEndY + 0.5,
    w: 11.5,
    h: 2.5,
    valign: 'top',
    wrap: true,
  });

  addConfidentialFooter(slide, lang);
}

function buildPlanningSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titlePlanning', lang), { fontSize: 32 });

  // Intro text
  const introText = t('planningIntro', lang).replace(
    '{weeks}',
    String(data.planning.totalWeeks)
  );

  slide.addText(introText, {
    x: 0.5,
    y: 1.1,
    w: 12.0,
    h: 0.5,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.darkBlue,
  });

  // Build Gantt chart using rectangles
  const ganttStartX = 0.5;
  const ganttStartY = 2.0;
  const ganttWidth = 12.33;
  const rowHeight = 0.55;
  const labelWidth = 2.5;
  const totalWeeks = data.planning.totalWeeks;
  const chartWidth = ganttWidth - labelWidth;
  const weekWidth = totalWeeks > 0 ? chartWidth / totalWeeks : 0;

  // Header row - week numbers
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: ganttStartX,
    y: ganttStartY,
    w: labelWidth,
    h: rowHeight,
    fill: { color: COLORS.darkBlue },
  });
  slide.addText('', {
    x: ganttStartX,
    y: ganttStartY,
    w: labelWidth,
    h: rowHeight,
  });

  for (let w = 0; w < totalWeeks; w++) {
    const x = ganttStartX + labelWidth + w * weekWidth;
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x,
      y: ganttStartY,
      w: weekWidth,
      h: rowHeight,
      fill: { color: COLORS.darkBlue },
      line: { color: COLORS.white, width: 0.5 },
    });
    slide.addText(`${t('weekAbbr', lang)}${w + 1}`, {
      x,
      y: ganttStartY,
      w: weekWidth,
      h: rowHeight,
      fontSize: 9,
      fontFace: FONTS.medium,
      color: COLORS.white,
      align: 'center',
      valign: 'middle',
    });
  }

  // WP rows
  let currentWeek = 0;
  data.workPackages.forEach((wp, idx) => {
    const rowY = ganttStartY + rowHeight * (idx + 1);

    // Background for row
    const rowFill = idx % 2 === 0 ? COLORS.lightGray : COLORS.white;
    slide.addShape('rect' as PptxGenJS.ShapeType, {
      x: ganttStartX,
      y: rowY,
      w: ganttWidth,
      h: rowHeight,
      fill: { color: rowFill },
      line: { color: COLORS.gray, width: 0.5 },
    });

    // WP label
    slide.addText(`WP${idx + 1}: ${wp.title}`, {
      x: ganttStartX + 0.1,
      y: rowY,
      w: labelWidth - 0.2,
      h: rowHeight,
      fontSize: 10,
      fontFace: FONTS.medium,
      color: COLORS.darkBlue,
      valign: 'middle',
      wrap: true,
    });

    // Colored bar
    const barX = ganttStartX + labelWidth + currentWeek * weekWidth;
    const barW = wp.durationWeeks * weekWidth;
    slide.addShape('roundRect' as PptxGenJS.ShapeType, {
      x: barX + 0.02,
      y: rowY + 0.08,
      w: Math.max(barW - 0.04, 0.1),
      h: rowHeight - 0.16,
      fill: { color: COLORS.yellow },
      rectRadius: 0.06,
    });

    // Duration text on bar
    slide.addText(`${wp.durationWeeks}${t('weekAbbr', lang).toLowerCase()}`, {
      x: barX,
      y: rowY,
      w: barW,
      h: rowHeight,
      fontSize: 9,
      fontFace: FONTS.medium,
      color: COLORS.darkBlue,
      align: 'center',
      valign: 'middle',
    });

    currentWeek += wp.durationWeeks;
  });

  addConfidentialFooter(slide, lang);
}

function buildBudgetSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.white };
  addCornerLogo(slide);
  addSlideTitle(slide, t('titleBudget', lang), { fontSize: 32 });

  const { totalWeeks, dailyRate, fteCount, vatRate } = data.budget;
  const totalHT = computeTotalBudget(data);
  const vatAmount = totalHT * (vatRate / 100);
  const totalTTC = totalHT + vatAmount;

  // Budget summary lines
  const summaryLines = [
    t('budgetWeeks', lang).replace('{n}', String(totalWeeks)),
    t('budgetFTE', lang).replace('{n}', String(fteCount)),
    t('budgetDailyRate', lang).replace('{rate}', String(dailyRate)),
    `${t('budgetTotal', lang)} ${totalWeeks} x 5 x ${fteCount} x ${dailyRate} = ${formatEur(totalHT)}`,
  ].join('\n');

  slide.addText(summaryLines, {
    x: 0.5,
    y: 1.1,
    w: 12.0,
    h: 1.6,
    fontSize: 14,
    fontFace: FONTS.body,
    color: COLORS.black,
    lineSpacingMultiple: 1.5,
  });

  // Summary table: Subject | Unit Price | Qty | Total
  type TableRow = PptxGenJS.TableRow;

  const tblHeader: TableRow = [
    {
      text: t('budgetSubject', lang),
      options: {
        fontSize: 12,
        fontFace: FONTS.titleBlack,
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.darkBlue },
        align: 'center',
        valign: 'middle',
      },
    },
    {
      text: t('budgetUnitPrice', lang),
      options: {
        fontSize: 12,
        fontFace: FONTS.titleBlack,
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.darkBlue },
        align: 'center',
        valign: 'middle',
      },
    },
    {
      text: t('budgetQty', lang),
      options: {
        fontSize: 12,
        fontFace: FONTS.titleBlack,
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.darkBlue },
        align: 'center',
        valign: 'middle',
      },
    },
    {
      text: t('budgetTotalCol', lang),
      options: {
        fontSize: 12,
        fontFace: FONTS.titleBlack,
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.darkBlue },
        align: 'center',
        valign: 'middle',
      },
    },
  ];

  const cellOpts = {
    fontSize: 12,
    fontFace: FONTS.body,
    color: COLORS.black,
    align: 'center' as const,
    valign: 'middle' as const,
    fill: { color: COLORS.lightGray },
  };

  const totalDays = totalWeeks * 5 * fteCount;
  const tblBody: TableRow = [
    { text: t('budgetStudy', lang), options: cellOpts },
    { text: `${formatEur(dailyRate)}/day`, options: cellOpts },
    { text: `${totalDays} days`, options: cellOpts },
    {
      text: formatEur(totalHT),
      options: {
        ...cellOpts,
        bold: true,
        fontFace: FONTS.titleBlack,
      },
    },
  ];

  slide.addTable([tblHeader, tblBody], {
    x: 0.5,
    y: 2.9,
    w: 12.33,
    colW: [4.0, 2.78, 2.78, 2.77],
    rowH: 0.5,
    border: { pt: 0.5, color: COLORS.mediumGray },
  });

  // VAT table
  const vatHeaderStyle = {
    fontSize: 12,
    fontFace: FONTS.titleBlack,
    bold: true,
    color: COLORS.white,
    fill: { color: COLORS.darkBlue },
    align: 'center' as const,
    valign: 'middle' as const,
  };

  const vatCellStyle = {
    fontSize: 12,
    fontFace: FONTS.body,
    color: COLORS.black,
    align: 'center' as const,
    valign: 'middle' as const,
    fill: { color: COLORS.lightGray },
  };

  const vatRows: TableRow[] = [
    [
      { text: t('budgetTotalHT', lang), options: vatHeaderStyle },
      {
        text: t('budgetVAT', lang).replace('{rate}', String(vatRate)),
        options: vatHeaderStyle,
      },
      { text: t('budgetTotalTTC', lang), options: vatHeaderStyle },
    ],
    [
      { text: formatEur(totalHT), options: vatCellStyle },
      { text: formatEur(vatAmount), options: vatCellStyle },
      {
        text: formatEur(totalTTC),
        options: {
          ...vatCellStyle,
          bold: true,
          fontFace: FONTS.titleBlack,
        },
      },
    ],
  ];

  slide.addTable(vatRows, {
    x: 3.0,
    y: 4.3,
    w: 7.33,
    colW: [2.44, 2.44, 2.45],
    rowH: 0.5,
    border: { pt: 0.5, color: COLORS.mediumGray },
  });

  // Payment terms
  slide.addText(t('budgetPaymentTerms', lang), {
    x: 0.5,
    y: 5.6,
    w: 12.0,
    h: 0.8,
    fontSize: 13,
    fontFace: FONTS.body,
    italic: true,
    color: COLORS.darkBlue,
    lineSpacingMultiple: 1.3,
  });

  addConfidentialFooter(slide, lang);
}

function buildBackCoverSlide(pptx: PptxGenJS, data: ProposalData): void {
  const lang = data.language;
  const slide = pptx.addSlide();

  // Full-slide back cover image
  slide.addImage({
    data: back_cover,
    x: 0,
    y: 0,
    w: SLIDE.width,
    h: SLIDE.height,
  });

  addConfidentialFooter(slide, lang);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate an Alysophil-branded PPTX proposal and trigger browser download.
 */
export async function generateProposal(data: ProposalData): Promise<void> {
  const pptx = new PptxGenJS();

  // Presentation metadata
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
  pptx.author = 'Alysophil';
  pptx.company = 'Alysophil';
  pptx.title = `Proposal - ${data.client.name}`;
  pptx.subject = `Work proposal for ${data.client.name}`;

  // Slide 1 - Cover
  buildCoverSlide(pptx, data);

  // Slide 2 - Section: Context/Need
  buildSectionSlide(pptx, data, 'sectionContextNeed');

  // Slide 3 - Context
  buildContextSlide(pptx, data);

  // Slide 4 - Technical Specifications
  buildTechSpecsSlide(pptx, data);

  // Slide 5 - How we predict molecular properties (1)
  buildPredictionSlide1(pptx, data);

  // Slide 6 - How we predict molecular properties (2)
  buildPredictionSlide2(pptx, data);

  // Slide 7 - Challenges
  buildChallengesSlide(pptx, data);

  // Slide 8 - Encouraging initial research
  buildEncouragingSlide(pptx, data);

  // Slide 9 - Alysophil's position
  buildPositionSlide(pptx, data);

  // Slides 10+ - Study content (one per WP)
  data.workPackages.forEach((wp, idx) => {
    buildStudyContentSlide(pptx, data, wp, idx);
  });

  // Slide N+1 - Resources & deliverables
  buildResourcesSlide(pptx, data);

  // Slide N+2 - Planning
  buildPlanningSlide(pptx, data);

  // Slide N+3 - Budget
  buildBudgetSlide(pptx, data);

  // Final slide - Back cover
  buildBackCoverSlide(pptx, data);

  // Generate and download
  const sanitizedName = data.client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Alysophil_Proposal_${sanitizedName}_${data.client.reference || 'DRAFT'}.pptx`;

  await pptx.writeFile({ fileName });
}
