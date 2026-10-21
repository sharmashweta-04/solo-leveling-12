'use client';

import IntroScreen from '@/src/components/IntroScreen';
import { useRouter } from 'next/navigation';

export default function IntroPage() {
  const router = useRouter();

  return (
    <IntroScreen
      level={1}
      isReplay={true}
      onComplete={() => router.push('/')}
    />
  );
}
