# LINE公式アカウント 初期メッセージ（ウェルカムメッセージ）

## 設定方法

LINE Developers Consoleで以下の手順で設定してください：

1. LINE Developers Consoleにログイン
2. チャンネルを選択
3. 「Messaging API」タブを開く
4. 「ウェルカムメッセージ」セクションを開く
5. 以下のメッセージをコピー＆ペースト
6. `{YOUR_DOMAIN}`を実際のドメインに置き換える（例: `https://shukin-pay.example.com`）

---

## 日本語版（推奨）

```
集金Payへようこそ！🎉

このアカウントは、イベントの集金を自動化するためのサービスです。

【主な機能】
✅ LINE経由での自動イベント作成
✅ 複数の決済方法に対応（PayPay、Stripe、銀行振込、現金）
✅ 条件に応じた金額設定

【使い方】

1️⃣ アカウント連携
まず、集金Payのアプリに登録して、LINEアカウントと連携してください。
👉 ダッシュボード: {YOUR_DOMAIN}/dashboard
👉 ハンバーガーメニュー > 「LINE連携」から連携できます

2️⃣ イベント作成
グループチャットで、このアカウントをメンションして「集金」と送信すると、過去のチャット履歴から自動でイベントを作成します。

例: @集金Pay 集金

3️⃣ 決済リンクの共有
作成されたイベントの決済リンクがグループに送信されます。参加者に共有してください。

【未連携の場合】
まだアカウントを連携していない場合は、上記のダッシュボードから登録・連携を行ってください。

ご不明な点がございましたら、お気軽にお問い合わせください。
```

## 英語版

```
Welcome to Shukin Pay! 🎉

This account is a service for automating event payment collection.

【Main Features】
✅ Automatic event creation via LINE
✅ Support for multiple payment methods (PayPay, Stripe, Bank Transfer, Cash)
✅ Conditional pricing based on options

【How to Use】

1️⃣ Account Linking
First, register with Shukin Pay app and link your LINE account.
👉 Dashboard: {YOUR_DOMAIN}/dashboard
👉 Go to Hamburger menu > "LINE Integration" to link

2️⃣ Create Events
In a group chat, mention this account and send "集金" to automatically create an event from chat history.

Example: @ShukinPay 集金

3️⃣ Share Payment Links
Payment links for created events will be sent to the group. Share them with participants.

【Not Linked Yet?】
If you haven't linked your account yet, please register and link from the dashboard above.

If you have any questions, please feel free to contact us.
```

## 短縮版（文字数制限がある場合）

```
集金Payへようこそ！🎉

【使い方】
1. アプリに登録してLINE連携
   👉 {YOUR_DOMAIN}/dashboard

2. グループで「@集金Pay 集金」と送信
   過去のチャットから自動でイベント作成

3. 決済リンクを参加者に共有

未連携の方は、まずダッシュボードから登録してください。
```

---

## 補足情報

### 連携フロー

1. **通常の連携（推奨）**
   - ダッシュボードで「LINE連携」ボタンをクリック
   - 表示されたリンクからLINE公式アカウントを追加
   - 自動的に連携完了

2. **先にLINE公式アカウントを追加した場合**
   - ダッシュボードで「LINE連携」を開く
   - 表示された手動連携トークンをコピー
   - LINE公式アカウントにトークンをメッセージとして送信
   - 連携完了

### 自動イベント作成の詳細

- **トリガー**: グループチャットで「@集金Pay 集金」とメンション付きで送信
- **処理内容**: 
  - 過去24時間のチャット履歴を取得
  - LLM（GPT-5.1）が履歴を分析
  - イベント名、日付、基本金額、条件、決済方法を自動生成
  - イベント詳細をメッセージで送信
  - 決済リンクをグループに送信
- **制限**: 連携済みユーザーのみ利用可能

### 環境変数の確認

初期メッセージに使用するドメインは、`.env`ファイルの`NEXT_PUBLIC_APP_URL`の値を使用してください。

例:
```
NEXT_PUBLIC_APP_URL=https://shukin-pay.example.com
```

この場合、初期メッセージ内の`{YOUR_DOMAIN}`を`https://shukin-pay.example.com`に置き換えてください。

