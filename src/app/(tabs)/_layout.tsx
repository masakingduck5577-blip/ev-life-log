import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useRecording } from '@/recording/recording-context';

/** 4つのタブ。はじめての人は「はじめに」の画面へ */
export default function TabLayout() {
  const { ready, onboarded } = useRecording();
  if (ready && !onboarded) return <Redirect href="/onboarding" />;
  return <AppTabs />;
}
