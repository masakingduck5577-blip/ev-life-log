# TestFlight で配る手順と、出す文面（下書き）

ゆいの杜店の販売店の人と伴走企業の2人に試してもらい、そのあとゆいの杜店で一般の人にも触ってもらうための準備です。
TestFlight の「外部テスト」を使います（相手を App Store Connect のメンバーにしなくてよい）。

## 1. 流れ

| 段階 | 相手 | 配り方 | Apple の審査 |
|---|---|---|---|
| 1 | 販売店の人・伴走企業の2人 | 外部テスト（メールで招待） | 最初の1回だけ「ベータ版の審査」（だいたい1〜2日） |
| 2 | ゆいの杜店の一般の人 | 同じ外部テストの公開リンク（QR コードにして店に置く） | 同じ版なら、追加の審査はほぼいらない |

- 相手は iPhone に「TestFlight」アプリを入れ、招待メール（または公開リンク）から入れる。
- 1つのビルドは90日で使えなくなる。
- Android の人には別に APK を作る（TestFlight は iPhone だけ）。

## 2. やること

| # | だれが | やること |
|---|---|---|
| 1 | 開発 | アプリ名「EVライフログ」とアイコンを入れる（済み）。本番用のアプリでは「テスト操作」の欄を隠す（済み） |
| 2 | 開発 | 運転の判定の決まり8を時速35kmにする（済み） |
| 3 | 伊藤 | App Store Connect で「マイApp」→「＋」→ 新規App。プラットフォーム iOS、名前「EVライフログ」（ほかのアプリと同じ名前は使えないので、だめなら「EVライフログ（試験版）」など）、言語 日本語、バンドルID `com.masaki.evlifelog`、SKU は `evlifelog` など |
| 4 | 開発 | 本番用のビルド：`npx eas-cli build --profile production --platform ios` |
| 5 | 伊藤 | ビルドを送る：`npx eas-cli submit --platform ios --latest`（最初の1回は Apple ID のログインと2段階認証が要るので、本人のパソコンで動かす） |
| 6 | 伊藤 | App Store Connect の「TestFlight」で、下の文面を入れる。「外部テスト」のグループを作り、ビルドを足して審査に出す |
| 7 | 伊藤 | 審査が通ったら、販売店の人・伴走企業の2人をメールで招待する |
| 8 | 伊藤 | 一般の人向けには、公開リンクを出し、QR コードにして店に置く |

## 3. App Store Connect に入れる文面（下書き）

### ベータ版 App の説明（Beta App Description）
> ふだん通りに過ごすと、スマホが車での移動を記録し、「あなたの毎日がEVだったら」をあなたの数字で見せるアプリの試験版です。EVだった場合のバッテリー残量の移り変わり、家と出先での充電の回数、燃料代と電気代の違い、通った道の近くの充電スポットが分かります。位置情報はスマホの中だけで計算し、外には送りません。

### テストしてほしいこと（What to Test）
> 1. 「はじめる」を押して、位置情報（「常に」）とお知らせを許可してください。
> 2. ふだん通りに車で出かけてください（アプリを開かなくても記録されます）。
> 3. 記録タブで、走った距離・運転の回数・EVだったらの結果・バッテリー残量のグラフを見てください。
> 4. 電車やバスに乗った移動が「車ではない」と判断されているか、1日の記録で確かめてください。違っていたら「車だった」に直せます。
> すぐに結果の見え方を見たいときは、はじめの画面の「お試しで見る（架空の7日間）」を押してください。
> 気づいたことは、TestFlight のスクリーンショットから送ってください。

### 審査用のメモ（Review Notes）
> This app records the user's car trips in the background and estimates the battery level and costs if the car were an EV.
> - Background location ("Always") is required because trips must be recorded while the app is closed. Location data is processed and stored only on the device and is never sent to any server. There is no account.
> - To review without driving, tap 「お試しで見る（架空の7日間）」 on the first screen, then 「お試しで見る」 on the next screen. The app replays seven days of sample trips around Utsunomiya and immediately shows the results.
> - Notifications are local notifications only (no push notifications).

### そのほかの欄
| 欄 | 入れるもの |
|---|---|
| フィードバック用のメールアドレス | masaking.duck5577@gmail.com |
| マーケティング URL | なくてよい |
| プライバシーポリシーの URL | https://masakingduck5577-blip.github.io/ev-life-log/privacy.html |
| 連絡先（審査の人向け） | 名前・電話番号・メール（伊藤） |
| サインインが必要か | いいえ（アカウントはない） |
| 暗号化 | 使っていない（app.json に ITSAppUsesNonExemptEncryption: false を入れてある） |

## 4. 気をつけること

- **位置を「常に」使う理由**は、審査で特に見られる。許可の画面の説明文と、審査用のメモの両方に書いてある。
- **一般の人がお店で触る場合**：本当の記録には日数がかかるので、その場では「お試しで見る」を使ってもらう。1週間試してくれる人にだけ、QR コードで入れてもらう。
- **結果は集まらない**：記録と結果はスマホの中だけ。試した人の結果を最終報告に使うなら、相談メモを見せてもらうか、同意を取って集計だけ送る仕組みを作る。
- **電池の減り**：位置を高い精度で取り続けるので、電池が早く減ることを伝える。
- **補助金の金額**：公式ページで確かめたものだけを出す決まり。配る前に、金額と確認日を見直す。
- 本番用のビルドも、EAS の月のビルドの回数に入る。
