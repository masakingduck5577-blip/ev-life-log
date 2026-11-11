import { Screen, Section } from '@/components/screen';

/** 記録タブ：記録中の状態・1日の記録・結果 */
export default function RecordScreen() {
  return (
    <Screen title="記録" lead="1週間ふだん通りに過ごすと、車での移動を記録します。">
      <Section
        title="記録中の状態"
        description="記録している日数や、今日の移動を表示します。"
        pending
      />
      <Section
        title="1日の記録"
        description="その日に車で移動した道と距離を、1日ずつ見られます。"
        pending
      />
      <Section
        title="結果：あなたの1週間がEVだったら"
        description="7日間の電池の残り、通った道の充電スポット、費用の違いを表示します。"
        pending
      />
    </Screen>
  );
}
