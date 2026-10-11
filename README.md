# 像素街機 Pixel Arcade

在瀏覽器裡遊玩的復古小遊戲合集。所有遊戲皆以 TypeScript 與 Canvas 2D 從零實作，畫面與音效全部由程式即時產生，不使用任何原作素材。

線上版本：`https://<你的 GitHub 帳號>.github.io/pixel-arcade/`

## 收錄遊戲

| 遊戲 | 分類 | 操作 |
| --- | --- | --- |
| 貪食蛇 | 動作 | 方向鍵 / WASD |
| 踩地雷 | 益智 | 滑鼠左鍵開格、右鍵插旗；鍵盤方向鍵 + 空白鍵 / X |
| 打磚塊 | 動作 | ← → 或滑鼠移動球拍，空白鍵發球 |
| 方塊堆疊 | 益智 | ← → 移動、↑ 旋轉、X 逆時針、↓ 加速、空白鍵直接落下 |
| 星際入侵 | 射擊 | ← → 移動，空白鍵射擊 |
| 乒乓 | 動作 | ↑ ↓ 或滑鼠移動球拍，對電腦先拿 7 分獲勝 |
| 2048 | 益智 | 方向鍵或滑動手勢合併數字 |
| 記憶翻牌 | 益智 | 滑鼠點擊翻牌；鍵盤方向鍵 + 空白鍵 |
| 井字遊戲 | 棋類 | 滑鼠點擊落子，對電腦 5 局制 |

全域快捷鍵：`P` / `Esc` 暫停、`R` 重新開始（暫停或結束時）、`M` 靜音、`F` 全螢幕。
觸控裝置會在遊戲畫面下方顯示虛擬按鍵。

## 功能

- 街機大廳：搜尋、分類篩選、收藏
- 每款遊戲三種難度，最高分依「遊戲 × 難度」分開記錄（存在瀏覽器 localStorage）
- 8-bit 合成音效、CRT 掃描線效果（可在設定中關閉）
- 每款遊戲有獨立網址，例如 `#/game/snake`，可以直接分享

## 開發

需要 Node.js 20 以上。

```bash
npm install
npm run dev
npm test
npm run build
```

## 架構

```
src/
├─ types/game.ts      遊戲模組介面（主機與卡帶之間的約定）
├─ core/              遊戲迴圈、輸入、音效、儲存、畫布縮放、自動註冊
├─ app/               路由、大廳、遊戲主機、覆蓋層、虛擬按鍵、設定面板
├─ games/<id>/        每款遊戲：meta.ts（資訊）、game.ts（本體）、logic.ts（純邏輯）
└─ styles/
tests/                Vitest 單元測試
```

### 新增一款遊戲

1. 在 `src/games/` 新增資料夾，名稱即遊戲 ID。
2. `meta.ts` 匯出 `meta: GameMeta`，`id` 必須與資料夾名稱相同。
3. `game.ts` 匯出 `createGame(): Game`。
4. 規則寫在 `logic.ts`，並在 `tests/` 補上單元測試。

大廳會自動列出新遊戲，不需要修改其他檔案。

## 部署

推送到 `main` 分支後，GitHub Actions 會自動測試、建置並部署到 GitHub Pages。
第一次使用時，請到 repo 的 **Settings → Pages**，把 **Source** 設為 **GitHub Actions**。
如果 repo 名稱不是 `pixel-arcade`，請同步修改 `vite.config.ts` 的 `base`。

## 授權與致敬

- 本專案為向經典遊戲致敬的學習作品，與原作公司無關。
- 字型：[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)、[Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)，皆為 SIL Open Font License 1.1。
