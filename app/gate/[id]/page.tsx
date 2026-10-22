import syllabusData from '@/config/syllabus.json';
import GateDetailClient from './GateDetailClient';

/**
 * Pre-generate all 37 NCERT Chapter Gate routes for offline PWA support.
 */
export function generateStaticParams() {
  return syllabusData.chapters.map((ch) => ({
    id: ch.id
  }));
}

export default async function GatePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GateDetailClient gateId={id} />;
}
