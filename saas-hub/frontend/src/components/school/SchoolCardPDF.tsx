import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const mm = (n: number) => n * 2.8346;

const CARD_W = mm(85);
const CARD_H = mm(54);
const HEADER_H = mm(13);
const PAGE_PAD = mm(8);
const CARD_GAP = mm(4);
const PHOTO_W = mm(19);
const PHOTO_H = mm(25);

export interface CardStudent {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  matricule?: string | null;
  photo_url?: string | null;
  class_name?: string | null;
  gender?: string | null;
}

export interface CardOptions {
  schoolName: string;
  logoUrl?: string | null;
  yearLabel: string;
  themeColor: string;
  expiryDate: string;
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function initials(s: CardStudent) {
  return `${(s.first_name || '')[0] || ''}${(s.last_name || '')[0] || ''}`.toUpperCase();
}

const s = StyleSheet.create({
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: PAGE_PAD,
    backgroundColor: '#f1f5f9',
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#ffffff',
    marginRight: CARD_GAP,
    marginBottom: CARD_GAP,
    borderRadius: mm(2),
    overflow: 'hidden',
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: mm(3),
  },
  headerLeft: { flexDirection: 'column' },
  headerTitle: { color: '#ffffff', fontSize: 6.5, fontWeight: 'bold', textTransform: 'uppercase' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 5, marginTop: 1 },
  headerLogo: { width: mm(9), height: mm(9), borderRadius: mm(1) },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: mm(3),
    paddingVertical: mm(2.5),
  },
  photoBox: {
    width: PHOTO_W,
    height: PHOTO_H,
    backgroundColor: '#e2e8f0',
    borderRadius: mm(1.5),
    overflow: 'hidden',
    marginRight: mm(3),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  photo: { width: PHOTO_W, height: PHOTO_H, objectFit: 'cover' },
  photoPlaceholder: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 7.5, fontWeight: 'bold', color: '#0f172a', marginBottom: mm(2) },
  row: { flexDirection: 'row', marginBottom: mm(1) },
  rowLabel: { fontSize: 5.5, color: '#64748b', width: mm(18) },
  rowValue: { fontSize: 5.5, color: '#1e293b', flex: 1 },
  footer: {
    height: mm(4),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mm(3),
    borderTop: '0.5pt solid #e2e8f0',
    justifyContent: 'flex-end',
  },
  footerText: { fontSize: 4.5, color: '#94a3b8' },
});

function CardItem({ student, opts }: { student: CardStudent; opts: CardOptions }) {
  const headerStyle = { ...s.header, backgroundColor: opts.themeColor };
  return (
    <View style={s.card}>
      <View style={headerStyle}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>{opts.schoolName}</Text>
          <Text style={s.headerSub}>Carte scolaire — {opts.yearLabel}</Text>
        </View>
        {opts.logoUrl ? (
          <Image style={s.headerLogo} src={opts.logoUrl} />
        ) : null}
      </View>

      <View style={s.body}>
        <View style={s.photoBox}>
          {student.photo_url ? (
            <Image style={s.photo} src={student.photo_url} />
          ) : (
            <Text style={s.photoPlaceholder}>{initials(student)}</Text>
          )}
        </View>

        <View style={s.info}>
          <Text style={s.name}>{student.first_name} {student.last_name}</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>Classe</Text>
            <Text style={s.rowValue}>{student.class_name || '—'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Matricule</Text>
            <Text style={s.rowValue}>{student.matricule || '—'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Né(e) le</Text>
            <Text style={s.rowValue}>{formatDate(student.birth_date)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Valide jusqu'au</Text>
            <Text style={s.rowValue}>{formatDate(opts.expiryDate)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

interface Props {
  students: CardStudent[];
  opts: CardOptions;
}

export default function SchoolCardDocument({ students, opts }: Props) {
  return (
    <Document title={`Cartes scolaires — ${opts.schoolName}`}>
      <Page size="A4" style={s.page}>
        {students.map(st => (
          <CardItem key={st.id} student={st} opts={opts} />
        ))}
      </Page>
    </Document>
  );
}
