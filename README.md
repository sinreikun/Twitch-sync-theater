# Twitch Sync Theater 🎬

複数のTwitch VODおよびLIVE配信を「実際の配信開始時刻」に基づいて自動で同期再生するWebアプリです。  
TwitchTheaterのようなUIに、時刻ベースの同期機能と補正調整を加えています。プレイヤーは公式のTwitch Embedを利用しています。

## 🔧 機能一覧

- TwitchのVOD / LIVEをURL or チャンネル名から追加
- 配信開始時間をTwitch APIから自動取得
- 共通シークバーで再生位置を時刻ベースで同期
- 各動画に±調整ボタン（補正オフセット）
- 完全クライアントサイドで動作（APIキーのみ必要）

## 🚀 利用方法

1. このページを開く（GitHub Pagesで公開可）
2. 視聴したい配信者の名前やVOD URLを追加
3. [同期再生] を押すと、配信開始時刻に基づいて自動調整
4. 各視点の±調整で微調整も可能
5. APIで開始時刻を取得できなかった場合は現在時刻で追加されます

## 📦 公開例（GitHub Pages）
https://yourusername.github.io/Twitch-sync-theater/

- Twitch APIキー（Client ID + OAuth Token）は設定欄から入力してください。
  入力した値はローカルストレージに保存され、次回以降自動で反映されます。
- 本ツールは非公式であり、Twitchとは無関係です
