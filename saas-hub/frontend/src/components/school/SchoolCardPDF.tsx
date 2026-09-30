import type { ReactNode } from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// Cartes scolaires recto-verso au format carte bancaire (85 × 54 mm), 3 modèles de recto
// et un verso commun. Les aperçus HTML de SchoolCardsPage reproduisent ces mises en page
// à l'écran (1 mm = 4 px, 1 pt ≈ 1,41 px) — garder les deux alignés.

const mm = (n: number) => n * 2.8346;

const CARD_W   = mm(85);
const CARD_H   = mm(54);
const CARD_GAP = mm(4);
// Grille de 2 × 4 cartes centrée sur la page : les versos, placés en miroir, tombent
// exactement derrière leur recto en impression recto-verso (retournement bord long).
const PAGE_PAD_X = (mm(210) - (2 * CARD_W + CARD_GAP)) / 2;
const PAGE_PAD_Y = mm(10);
const PER_PAGE   = 8;

export interface CardStudent {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  matricule?: string | null;
  photo_url?: string | null;
  class_name?: string | null;
  gender?: string | null;
  phone?: string | null;        // téléphone du tuteur, sinon de l'élève
  phoneLabel?: string;          // « Tél. tuteur » ou « Téléphone »
  qrDataUrl?: string;
}

export interface CardOptions {
  schoolName: string;
  logoUrl?: string | null;
  armoirieUrl?: string | null;
  schoolPhone?: string | null;
  schoolAddress?: string | null;
  yearLabel: string;
  themeColor: string;
  expiryDate: string;
  modelId: 'classique' | 'moderne' | 'elegant';
}

export function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function initials(s: { first_name: string; last_name: string }) {
  return `${(s.first_name || '')[0] || ''}${(s.last_name || '')[0] || ''}`.toUpperCase();
}

/** Mélange la couleur du thème avec du blanc : strength 0 = blanc, 1 = couleur pleine. */
export function tint(hex: string, strength: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * strength);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => mix(c).toString(16).padStart(2, '0')).join('');
}

/** Champs du recto (pas de lieu de naissance ni de nom de tuteur ; la validité est au verso). */
export function cardFields(student: CardStudent): [string, string][] {
  return [
    ['Classe',    student.class_name || '—'],
    ['Matricule', student.matricule  || '—'],
    ['Né(e) le',  formatDate(student.birth_date)],
    [student.phoneLabel || 'Téléphone', student.phone || '—'],
  ];
}

// Typographie commune (pt)
export const CARD_FONT = { school: 8.5, tag: 5.8, name: 10, label: 6.2, value: 7.4 };
const T = CARD_FONT;

// ─── Éléments partagés ─────────────────────────────────────────────────────
function LogoBox({ opts, size }: { opts: CardOptions; size: number }) {
  return (
    <View style={{ width: mm(size), height: mm(size), borderRadius: mm(1.5), backgroundColor: '#fff', padding: mm(0.8), alignItems: 'center', justifyContent: 'center' }}>
      {opts.logoUrl
        ? <Image src={opts.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <Text style={{ fontSize: size * 0.9, fontWeight: 'bold', color: opts.themeColor }}>{(opts.schoolName || 'É')[0]}</Text>}
    </View>
  );
}

/** Armoiries de la Guinée sur fond blanc (l'or ressort mal sur les couleurs du thème). */
function Armoirie({ opts, size }: { opts: CardOptions; size: number }) {
  if (!opts.armoirieUrl) return null;
  return (
    <View style={{ width: mm(size * 0.85), height: mm(size), borderRadius: mm(1.5), backgroundColor: '#fff', padding: mm(0.6), alignItems: 'center', justifyContent: 'center' }}>
      <Image src={opts.armoirieUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </View>
  );
}

function Photo({ student, color, w, h, round }: { student: CardStudent; color: string; w: number; h: number; round?: boolean }) {
  const radius = round ? mm(w / 2) : mm(1.5);
  return (
    <View style={{ width: mm(w), height: mm(h), borderRadius: radius, borderWidth: mm(0.6), borderColor: color, backgroundColor: tint(color, 0.08), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {student.photo_url
        ? <Image src={student.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <Text style={{ fontSize: 13, fontWeight: 'bold', color: tint(color, 0.5) }}>{initials(student)}</Text>}
    </View>
  );
}

function Fields({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([l, v]) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: mm(1) }}>
          <Text style={{ fontSize: T.label, color: '#64748b', width: mm(15) }}>{l}</Text>
          <Text style={{ fontSize: T.value, color: '#0f172a', fontWeight: 'bold', flex: 1 }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Qr({ student, size }: { student: CardStudent; size: number }) {
  if (!student.qrDataUrl) return null;
  return <Image src={student.qrDataUrl} style={{ width: mm(size), height: mm(size) }} />;
}

const base = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, backgroundColor: '#fff', borderRadius: mm(2.5), overflow: 'hidden' },
  name: { fontSize: T.name, fontWeight: 'bold', color: '#0f172a', marginBottom: mm(1.6) },
});

// ─── Recto 1 : Classique ───────────────────────────────────────────────────
// Bandeau (logo · école · « Carte scolaire · année » · armoiries) · Photo portrait · Infos · QR
function Model1({ student, opts }: { student: CardStudent; opts: CardOptions }) {
  const c = opts.themeColor;
  return (
    <View style={base.card}>
      <View style={{ height: mm(14), backgroundColor: c, flexDirection: 'row', alignItems: 'center', paddingHorizontal: mm(3) }}>
        <LogoBox opts={opts} size={10} />
        <View style={{ marginLeft: mm(2.5), flex: 1 }}>
          <Text style={{ fontSize: T.school, fontWeight: 'bold', color: '#fff' }}>{opts.schoolName.toUpperCase()}</Text>
          <Text style={{ fontSize: T.tag, color: '#fff', opacity: 0.85, letterSpacing: 0.6, marginTop: 1.5 }}>CARTE SCOLAIRE · {opts.yearLabel}</Text>
        </View>
        <Armoirie opts={opts} size={10} />
      </View>
      <View style={{ height: mm(0.9), backgroundColor: tint(c, 0.35) }} />
      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: mm(3), paddingVertical: mm(2.3) }}>
        <Photo student={student} color={c} w={21} h={26} />
        <View style={{ flex: 1, marginLeft: mm(3), justifyContent: 'center' }}>
          <Text style={base.name}>{student.first_name} {student.last_name}</Text>
          <Fields rows={cardFields(student)} />
        </View>
        <View style={{ justifyContent: 'flex-end', marginLeft: mm(1) }}>
          <Qr student={student} size={13} />
        </View>
      </View>
    </View>
  );
}

// ─── Recto 2 : Moderne ─────────────────────────────────────────────────────
// Barre latérale (logo, photo ronde, école) · Infos à droite (armoiries en haut) · QR bas-droite
function Model2({ student, opts }: { student: CardStudent; opts: CardOptions }) {
  const c = opts.themeColor;
  return (
    <View style={{ ...base.card, flexDirection: 'row' }}>
      <View style={{ width: mm(25), backgroundColor: c, alignItems: 'center', justifyContent: 'center', paddingHorizontal: mm(1.5) }}>
        <LogoBox opts={opts} size={8} />
        <View style={{ marginTop: mm(2), borderRadius: mm(10), borderWidth: mm(0.8), borderColor: '#fff' }}>
          <Photo student={student} color={c} w={18} h={18} round />
        </View>
        <Text style={{ fontSize: 5.8, color: '#fff', textAlign: 'center', marginTop: mm(1.8), fontWeight: 'bold' }}>{opts.schoolName.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: mm(3.5), paddingVertical: mm(2.8), justifyContent: 'center' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: mm(1.5) }}>
            <View>
              <Text style={{ fontSize: T.tag, fontWeight: 'bold', color: c, letterSpacing: 0.6 }}>CARTE SCOLAIRE</Text>
              <Text style={{ fontSize: T.tag, color: '#64748b', marginTop: 1 }}>{opts.yearLabel}</Text>
            </View>
            {opts.armoirieUrl ? <Image src={opts.armoirieUrl} style={{ width: mm(7), height: mm(8.5), objectFit: 'contain' }} /> : null}
          </View>
          <Text style={base.name}>{student.first_name} {student.last_name}</Text>
          <View style={{ height: mm(0.4), backgroundColor: tint(c, 0.25), marginBottom: mm(1.5) }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Fields rows={cardFields(student)} /></View>
          <Qr student={student} size={12} />
        </View>
      </View>
    </View>
  );
}

// ─── Recto 3 : Élégant ─────────────────────────────────────────────────────
// Bandeau haut (logo, école, année, armoiries) · Photo ronde + infos + QR · Liseré bas
function Model3({ student, opts }: { student: CardStudent; opts: CardOptions }) {
  const c = opts.themeColor;
  return (
    <View style={base.card}>
      <View style={{ height: mm(12), backgroundColor: c, flexDirection: 'row', alignItems: 'center', paddingHorizontal: mm(3) }}>
        <LogoBox opts={opts} size={8.5} />
        <View style={{ marginLeft: mm(2), flex: 1 }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#fff' }}>{opts.schoolName.toUpperCase()}</Text>
          <Text style={{ fontSize: T.tag, color: '#fff', opacity: 0.85, letterSpacing: 0.5, marginTop: 1 }}>CARTE SCOLAIRE · {opts.yearLabel}</Text>
        </View>
        <Armoirie opts={opts} size={8.5} />
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: mm(3), backgroundColor: tint(c, 0.05) }}>
        <Photo student={student} color={c} w={21} h={21} round />
        <View style={{ flex: 1, marginLeft: mm(3) }}>
          <Text style={base.name}>{student.first_name} {student.last_name}</Text>
          <Fields rows={cardFields(student)} />
        </View>
        <Qr student={student} size={13} />
      </View>
      <View style={{ height: mm(3.5), backgroundColor: c }} />
    </View>
  );
}

// ─── Verso (commun aux 3 modèles) ──────────────────────────────────────────
// Logo · école · adresse · téléphone · validité · consigne en cas de perte
function Verso({ opts }: { opts: CardOptions }) {
  const c = opts.themeColor;
  return (
    <View style={{ ...base.card, borderWidth: mm(0.3), borderColor: tint(c, 0.3) }}>
      <View style={{ height: mm(3.5), backgroundColor: c }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: mm(6) }}>
        <LogoBox opts={opts} size={16} />
        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0f172a', marginTop: mm(2), textAlign: 'center' }}>{opts.schoolName.toUpperCase()}</Text>
        {opts.schoolAddress ? <Text style={{ fontSize: 6.8, color: '#475569', marginTop: mm(1.2), textAlign: 'center' }}>{opts.schoolAddress}</Text> : null}
        {opts.schoolPhone ? <Text style={{ fontSize: 7.4, color: c, fontWeight: 'bold', marginTop: mm(1) }}>Tél. {opts.schoolPhone}</Text> : null}
        <View style={{ width: mm(30), height: mm(0.4), backgroundColor: tint(c, 0.3), marginVertical: mm(2) }} />
        <Text style={{ fontSize: 6.4, color: '#0f172a' }}>Année scolaire {opts.yearLabel} · valable jusqu'au {formatDate(opts.expiryDate)}</Text>
        <Text style={{ fontSize: 5.6, color: '#64748b', marginTop: mm(1), textAlign: 'center' }}>En cas de perte, merci de rapporter cette carte à l'établissement.</Text>
      </View>
      <View style={{ height: mm(3.5), backgroundColor: c }} />
    </View>
  );
}

// ─── Document : pages de rectos puis versos en miroir ──────────────────────
interface Props {
  students: CardStudent[];
  opts: CardOptions;
}

function Grid({ rows }: { rows: ReactNode[][] }) {
  return (
    <Page size="A4" style={{ paddingHorizontal: PAGE_PAD_X, paddingVertical: PAGE_PAD_Y, backgroundColor: '#fff' }}>
      {rows.map((cells, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: CARD_GAP }}>
          {cells.map((cell, j) => <View key={j} style={{ width: CARD_W, marginRight: j === 0 ? CARD_GAP : 0 }}>{cell}</View>)}
        </View>
      ))}
    </Page>
  );
}

export default function SchoolCardDocument({ students, opts }: Props) {
  const Recto = opts.modelId === 'moderne' ? Model2 : opts.modelId === 'elegant' ? Model3 : Model1;
  const pages: CardStudent[][] = [];
  for (let i = 0; i < students.length; i += PER_PAGE) pages.push(students.slice(i, i + PER_PAGE));
  return (
    <Document title={`Cartes scolaires — ${opts.schoolName}`}>
      {pages.flatMap((group, p) => {
        const pairs: CardStudent[][] = [];
        for (let i = 0; i < group.length; i += 2) pairs.push(group.slice(i, i + 2));
        const empty = <View style={{ width: CARD_W, height: CARD_H }} />;
        const rectos = pairs.map(pair => pair.map(st => <Recto key={st.id} student={st} opts={opts} />));
        // Verso en miroir : la carte de gauche passe à droite (retournement bord long)
        const versos = pairs.map(pair => pair.length === 2
          ? [<Verso key="b" opts={opts} />, <Verso key="a" opts={opts} />]
          : [empty, <Verso key="a" opts={opts} />]);
        return [<Grid key={`r${p}`} rows={rectos} />, <Grid key={`v${p}`} rows={versos} />];
      })}
    </Document>
  );
}
