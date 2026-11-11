import { Screen, Section } from '@/components/screen';

/** 充電マップタブ */
export default function MapScreen() {
  return (
    <Screen title="充電マップ" lead="宇都宮市のまわりの充電スポットを地図で見られます。">
      <Section
        title="地図"
        description="充電スポットと、ふだん通る道を地図に表示します。"
        pending
      />
    </Screen>
  );
}
