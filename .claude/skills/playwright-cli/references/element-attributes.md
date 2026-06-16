# 要素の属性を調べる

snapshot に要素の `id`、`class`、`data-*` 属性、その他の DOM プロパティが表示されない場合は、`eval` を使ってそれらを調べます。

## 例

```bash
playwright-cli snapshot
# snapshot ではボタンが e7 として表示されるが、その id や data 属性は表示されない

# 要素の id を取得する
playwright-cli eval "el => el.id" e7

# すべての CSS クラスを取得する
playwright-cli eval "el => el.className" e7

# 特定の属性を取得する
playwright-cli eval "el => el.getAttribute('data-testid')" e7
playwright-cli eval "el => el.getAttribute('aria-label')" e7

# 計算されたスタイルプロパティを取得する
playwright-cli eval "el => getComputedStyle(el).display" e7
```
