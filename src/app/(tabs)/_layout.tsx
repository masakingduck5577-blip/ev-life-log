import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useRecording } from '@/recording/recording-context';

/** 4つのタブ。アプリを開いたら、まず「はじめに」→ 入力の画面を通る */
export default function TabLayout() {
  const { ready, onboarded, entered } = useRecording();
  if (ready && (!onboarded || !entered)) return <Redirect href="/onboarding" />;
  return <AppTabs />;
}
