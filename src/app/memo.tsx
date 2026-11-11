import { Screen, Section } from '@/components/screen';

/** 相談メモタブ */
export default function MemoScreen() {
  return (
    <Screen title="相談メモ" lead="記録の結果を1枚にまとめて、お店で見せられます。">
      <Section
        title="1週間のまとめ"
        description="走った距離、電池の残り、費用の違いを1枚にまとめます。"
        pending
      />
      <Section title="お店で聞きたいこと" description="相談したいことを選んで残せます。" pending />
    </Screen>
  );
}
