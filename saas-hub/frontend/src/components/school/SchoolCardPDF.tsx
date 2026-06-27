import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const mm = (n: number) => n * 2.8346;

const CARD_W  = mm(85);
const CARD_H  = mm(54);
const PAGE_PAD = mm(8);
const CARD_GAP = mm(4);

export interface CardStudent {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  matricule?: string | null;
  photo_url?: string | null;
  class_name?: string | null;
  gender?: string | null;
  qrDataUrl?: string;
}

export interface CardOptions {
  schoolName: string;
  logoUrl?: string | null;
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

// ─── Modèle 1 : Classique ──────────────────────────────────────────────────
// Bandeau couleur en haut · Photo gauche · Infos + QR droite
const c1 = StyleSheet.create({
  card:       { width: CARD_W, height: CARD_H, backgroundColor: '#fff', marginRight: CARD_GAP, marginBottom: CARD_GAP, borderRadius: mm(2), overflow: 'hidden' },
  header:     { height: mm(13), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: mm(3) },
  hTitle:     { color: '#fff', fontSize: 6.5, fontWeight: 'bold' },
  hSub:       { color: 'rgba(255,255,255,0.82)', fontSize: 5, marginTop: 1 },
  hLogo:      { width: mm(9), height: mm(9), borderRadius: mm(1) },
  body:       { flex: 1, flexDirection: 'row', paddingHorizontal: mm(3), paddingVertical: mm(2) },
  photoBox:   { width: mm(19), height: mm(25), backgroundColor: '#e2e8f0', borderRadius: mm(1.5), overflow: 'hidden', marginRight: mm(3), alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  photo:      { width: mm(19), height: mm(25), objectFit: 'cover' },
  photoInit:  { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  info:       { flex: 1, justifyContent: 'center' },
  name:       { fontSize: 7.5, fontWeight: 'bold', color: '#0f172a', marginBottom: mm(2) },
  row:        { flexDirection: 'row', marginBottom: mm(1) },
  lbl:        { fontSize: 5.2, color: '#64748b', width: mm(17) },
  val:        { fontSize: 5.2, color: '#1e293b', flex: 1 },
  qrArea:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', marginTop: mm(1) },
  qr:         { width: mm(14), height: mm(14) },
});

function Model1({ student, opts }: { student: CardStudent; opts: CardOptions }) {
  return (
    <View style={c1.card}>
      <View style={{ ...c1.header, backgroundColor: opts.themeColor }}>
        <View>
          <Text style={c1.hTitle}>{opts.schoolName}</Text>
          <Text style={c1.hSub}>Carte scolaire — {opts.yearLabel}</Text>
        </View>
        {opts.logoUrl ? <Image style={c1.hLogo} src={opts.logoUrl} /> : null}
      </View>
      <View style={c1.body}>
        <View style={c1.photoBox}>
          {student.photo_url
            ? <Image style={c1.photo} src={student.photo_url} />
            : <Text style={c1.photoInit}>{initials(student)}</Text>}
        </View>
        <View style={c1.info}>
          <Text style={c1.name}>{student.first_name} {student.last_name}</Text>
          {([
            ['Classe',   student.class_name || '—'],
            ['Matricule',student.matricule  || '—'],
            ['Né(e) le', formatDate(student.birth_date)],
            ['Valide',   formatDate(opts.expiryDate)],
          ] as [string,string][]).map(([l, v]) => (
            <View key={l} style={c1.row}>
              <Text style={c1.lbl}>{l}</Text>
              <Text style={c1.val}>{v}</Text>
            </View>
          ))}
          {student.qrDataUrl && (
            <View style={c1.qrArea}>
              <Image style={c1.qr} src={student.qrDataUrl} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Modèle 2 : Moderne ────────────────────────────────────────────────────
// Barre latérale colorée gauche avec photo · Infos droite · QR bas-droite
const c2 = StyleSheet.create({
  card:       { width: CARD_W, height: CARD_H, backgroundColor: '#fff', marginRight: CARD_GAP, marginBottom: CARD_GAP, borderRadius: mm(2), overflow: 'hidden', flexDirection: 'row' },
  sidebar:    { width: mm(22), alignItems: 'center', justifyContent: 'center', paddingVertical: mm(2) },
  sSchool:    { color: 'rgba(255,255,255,0.75)', fontSize: 4.5, textAlign: 'center', marginTop: mm(2), paddingHorizontal: mm(1) },
  photoRound: { width: mm(16), height: mm(16), borderRadius: mm(8), overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  photo:      { width: mm(16), height: mm(16), objectFit: 'cover' },
  photoInit:  { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  right:      { flex: 1, paddingHorizontal: mm(3), paddingVertical: mm(3), justifyContent: 'space-between' },
  topRight:   {},
  year:       { fontSize: 5, color: '#94a3b8', marginBottom: mm(1) },
  name:       { fontSize: 8, fontWeight: 'bold', color: '#0f172a', marginBottom: mm(1.5) },
  row:        { flexDirection: 'row', marginBottom: mm(0.8) },
  lbl:        { fontSize: 5, color: '#64748b', width: mm(17) },
  val:        { fontSize: 5, color: '#1e293b', flex: 1 },
  bottom:     { flexDirection: 'row', justifyContent: 'flex-end' },
  qr:         { width: mm(14), height: mm(14) },
  logo:       { width: mm(8), height: mm(8), borderRadius: mm(1), marginBottom: mm(1) },
});

function Model2({ student, opts }: { student: CardStudent; opts: CardOptions }) {
  return (
    <View style={c2.card}>
      <View style={{ ...c2.sidebar, backgroundColor: opts.themeColor }}>
        {opts.logoUrl ? <Image style={c2.logo} src={opts.logoUrl} /> : null}
        <View style={c2.photoRound}>
          {student.photo_url
            ? <Image style={c2.photo} src={student.photo_url} />
            : <Text style={c2.photoInit}>{initials(student)}</Text>}
        </View>
        <Text style={c2.sSchool}>{opts.schoolName}</Text>
      </View>
      <View style={c2.right}>
        <View style={c2.topRight}>
          <Text style={c2.year}>{opts.yearLabel}</Text>
          <Text style={c2.name}>{student.first_name} {student.last_name}</Text>
          {([
            ['Classe',   student.class_name || '—'],
            ['Matricule',student.matricule  || '—'],
            ['Né(e) le', formatDate(student.birth_date)],
            ['Valide',   formatDate(opts.expiryDate)],
          ] as [string,string][]).map(([l, v]) => (
            <View key={l} style={c2.row}>
              <Text style={c2.lbl}>{l}</Text>
              <Text style={c2.val}>{v}</Text>
            </View>
          ))}
        </View>
        {student.qrDataUrl && (
          <View style={c2.bottom}>
            <Image style={c2.qr} src={student.qrDataUrl} />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Modèle 3 : Élégant ────────────────────────────────────────────────────
// Bandeau haut + bandeau bas colorés · Photo ronde centrée gauche · QR droite
const c3 = StyleSheet.create({
  card:       { width: CARD_W, height: CARD_H, backgroundColor: '#fff', marginRight: CARD_GAP, marginBottom: CARD_GAP, borderRadius: mm(2), overflow: 'hidden' },
  topBand:    { height: mm(9), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: mm(3) },
  topLeft:    { flexDirection: 'row', alignItems: 'center' },
  logo:       { width: mm(6), height: mm(6), borderRadius: mm(0.8), marginRight: mm(2) },
  topTitle:   { color: '#fff', fontSize: 6, fontWeight: 'bold' },
  topYear:    { color: 'rgba(255,255,255,0.8)', fontSize: 4.5 },
  topBadge:   { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: mm(2), paddingHorizontal: mm(2), paddingVertical: mm(0.5) },
  topBadgeTxt:{ color: '#fff', fontSize: 4.5 },
  body:       { flex: 1, flexDirection: 'row', paddingHorizontal: mm(3), paddingVertical: mm(1.5), alignItems: 'center' },
  photoCircle:{ width: mm(20), height: mm(20), borderRadius: mm(10), overflow: 'hidden', backgroundColor: '#e2e8f0', marginRight: mm(3), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  photo:      { width: mm(20), height: mm(20), objectFit: 'cover' },
  photoInit:  { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  info:       { flex: 1, justifyContent: 'center' },
  name:       { fontSize: 7.5, fontWeight: 'bold', color: '#0f172a', marginBottom: mm(1.5) },
  row:        { flexDirection: 'row', marginBottom: mm(0.8) },
  lbl:        { fontSize: 5, color: '#64748b', width: mm(17) },
  val:        { fontSize: 5, color: '#1e293b', flex: 1 },
  botBand:    { height: mm(10), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: mm(3) },
  botTxt:     { color: 'rgba(255,255,255,0.9)', fontSize: 5 },
  qr:         { width: mm(9), height: mm(9) },
});

function Model3({ student, opts }: { student: CardStudent; opts: CardOptions }) {
  return (
    <View style={c3.card}>
      <View style={{ ...c3.topBand, backgroundColor: opts.themeColor }}>
        <View style={c3.topLeft}>
          {opts.logoUrl ? <Image style={c3.logo} src={opts.logoUrl} /> : null}
          <View>
            <Text style={c3.topTitle}>{opts.schoolName}</Text>
            <Text style={c3.topYear}>{opts.yearLabel}</Text>
          </View>
        </View>
        <View style={c3.topBadge}>
          <Text style={c3.topBadgeTxt}>CARTE SCOLAIRE</Text>
        </View>
      </View>

      <View style={c3.body}>
        <View style={c3.photoCircle}>
          {student.photo_url
            ? <Image style={c3.photo} src={student.photo_url} />
            : <Text style={c3.photoInit}>{initials(student)}</Text>}
        </View>
        <View style={c3.info}>
          <Text style={c3.name}>{student.first_name} {student.last_name}</Text>
          {([
            ['Classe',   student.class_name || '—'],
            ['Matricule',student.matricule  || '—'],
            ['Né(e) le', formatDate(student.birth_date)],
          ] as [string,string][]).map(([l, v]) => (
            <View key={l} style={c3.row}>
              <Text style={c3.lbl}>{l}</Text>
              <Text style={c3.val}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ ...c3.botBand, backgroundColor: opts.themeColor }}>
        <Text style={c3.botTxt}>Valide jusqu'au {formatDate(opts.expiryDate)}</Text>
        {student.qrDataUrl && <Image style={c3.qr} src={student.qrDataUrl} />}
      </View>
    </View>
  );
}

// ─── Document principal ────────────────────────────────────────────────────
interface Props {
  students: CardStudent[];
  opts: CardOptions;
}

export default function SchoolCardDocument({ students, opts }: Props) {
  const CardComp = opts.modelId === 'moderne' ? Model2 : opts.modelId === 'elegant' ? Model3 : Model1;
  return (
    <Document title={`Cartes scolaires — ${opts.schoolName}`}>
      <Page size="A4" style={{ flexDirection: 'row', flexWrap: 'wrap', padding: PAGE_PAD, backgroundColor: '#f1f5f9' }}>
        {students.map(st => (
          <CardComp key={st.id} student={st} opts={opts} />
        ))}
      </Page>
    </Document>
  );
}
