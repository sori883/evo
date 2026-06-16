---
name: linear-memory
description: Linear をエージェントループの永続メモリバックエンドと状態管理バックエンドとして使うための Skill。Codex またはサブエージェントが Linear の work item を読む、実行ログを記録する、status/label による作業状態を更新する、判断を保存する、人間への確認事項を Linear にエスカレーションする必要があるときに使う。チャット文脈に依存せず、Linear を source of truth として扱う。
---

# Linear メモリ

## 概要

Linear を loop state の source of truth として使う。チャット文脈は一時的な実行文脈であり、memory として扱わない。

## メモリモデルの構成

- Linear Document: 運用ルール、backend 固有 policy、状態遷移ルール、長期的な loop convention。
- Linear Issue: 1 つの work item。目的、背景、受け入れ条件、現在の状態、検証、エスカレーションを持つ。
- Linear Comment: エージェントのアクション、調査結果、検証、人間向け質問の append-only 実行ログ。
- Linear Status: work item の大きな進捗状態。
- Linear Label: loop 管理対象、phase、blocker、人間確認、検証失敗などの補助状態。

## Linear Issue 名

Linear Issue の title は日本語で作成する。

- 新規 Issue、同期 Issue、分割 Issue、エスカレーション Issue の title は、簡潔な日本語の作業名にする。
- 英語だけの title を作らない。外部 issue、PR、CI、エラー文が英語の場合も、日本語に要約して title にする。
- 固有名詞、コード識別子、API 名、ライブラリ名、エラーコード、Linear/GitHub identifier は原文のまま残してよい。
- title は「何をするか」が分かる動詞句にする。例: `ログイン失敗時のエラー表示を修正する`。
- 詳細な背景、英語原文、ログ、リンクは description または Comment に残し、title に詰め込まない。

## 作業前に読むもの

1. ユーザー依頼、automation prompt、`.codex/loop.toml`、利用可能な config から対象の Linear Issue、Project、または discovery scope を特定する。
2. プロジェクト固有ルールを適用する前に、関連する Linear Document を読む。
3. 対象 Issue の description、status、labels、links、relations、最近の Comments を読む。
4. chat history と Linear の durable state が矛盾する場合は、最新の Linear state を優先する。
5. 必要な Issue や rule Document が見つからない場合は、不足している identifier を確認する。対象 Issue がある場合は escalation として記録する。
6. `.codex/loop.toml` がある場合は、その discovery scope、claim、write boundary、triage writer、write policy、completion evidence を project policy として扱う。

## 作業中に書くもの

現在のエージェント実行を超えて残すべき情報は Linear に記録する。

- project policy が controller-only mutation を定義している場合、controller 以外のエージェントは Linear 更新案と証拠だけを返し、controller が Linear に記録する。
- Linear Issue の作成または title 更新を提案する場合は、日本語 title を含める。
- 調査メモ、実装サマリ、検証結果、blocker、人間向け質問は Comment に追記する。
- 各工程後の cross-review 結果は Comment に追記する。
- GitHub branch、commit、PR、CI run と Linear issue の紐づけは Comment に追記する。
- Issue fields の更新は、project policy または user request が許可している場合だけ行う。
- 進捗ログを書くためだけに Issue description を上書きしない。run history は Comment に残す。
- 他エージェントの Comment を削除・改変しない。
- ログは事実ベースで簡潔にする。chain-of-thought や長い terminal output は、証拠として必要な場合を除いて保存しない。

## 振り返りと改善 Issue

loop 中に悪かった点、詰まり、検証不足、自動化できる手作業、agent の役割分担の曖昧さ、prompt / rule / test / skill / agent の不足を見つけた場合は、現在の work item の Comment または完了証跡に残す。

- 通常 run では、改善をその場で広げすぎない。現在の work item の受け入れ条件に必要な修正だけを行い、別作業にすべき改善は Linear に残す。
- PJ の最後、milestone/release/主要 PR 完了前、または人間が振り返りを要求した場合は、関連 Issue と Comment を読み、改善候補を集約する。
- 同じ原因や同じ改善先を持つ候補は 1 つの改善 Issue にまとめる。重複する根拠、英語原文、ログ、関連リンクは description または Comment に残す。
- 改善 Issue の title は日本語にする。labels には `loop-managed` と `loop-improvement` を付ける。
- すぐ実行できる改善には `ready-for-agent` を付ける。調査や整理が必要な改善には `needs-triage` を付ける。
- 既存 skill や agent では改善候補を解消できない場合は、改善 Issue に `capability-expansion` を付ける。新規 skill が必要なら `skill-gap`、新規 agent が必要なら `agent-gap` も付ける。
- 新規 skill / agent の作成は、それ自体を改善手段として扱ってよい。skill は `.agents/skills/<skill-name>/`、agent は `.codex/agents/<agent-name>.toml` に限定する。
- 広範な設計変更、破壊的変更、権限/費用/外部契約が絡む変更、受け入れ条件が曖昧な改善は `needs-human` として残す。
- 小さく局所的で検証可能な改善、skill 追加、agent 追加だけ、project policy の claim、TDD、review gate、completion evidence に従って自律実行してよい。
- 新規 skill / agent を作成または更新した場合は、作成理由、対象ファイル、検証、別エージェント review gate の結果を Comment または完了証跡に残す。

振り返りを記録する場合は、次の形式を使う。

```md
## 振り返り

対象:
読んだ Linear Issue / Comment:
見つけた悪かった点:
共通原因:
作成/更新した改善 Issue:
作成/更新した skill / agent:
自律修正してよい範囲:
needs-human にした判断:
残るリスク:
次:
```

## 状態機械

Linear の status は work item の大きな進捗だけに使う。TDD phase や review phase のような細かい状態は label または Comment に残す。

デフォルト status mapping:

- `Backlog`: 発見済み。まだ triage 済みではない。
- `Todo`: 実行可能。目的、受け入れ条件、対象範囲が十分に明確。
- `In Progress`: エージェントまたは人間が現在作業中。
- `In Review`: phase-reviewer、verifier、または人間の確認待ち。
- `Done`: 受け入れ条件を表す E2E、受け入れ、または最も外側に近い integration evidence が通り、必要な review gate も通っている。
- `Canceled`: やらない、または実行しない判断をした。
- `Duplicate`: 他 issue に統合する。

デフォルト labels:

- `loop-managed`: loop が管理する issue。
- `needs-triage`: まだ目的、受け入れ条件、スコープが足りない。
- `ready-for-agent`: エージェントが実行してよい。
- `agent-active`: エージェントが作業中。
- `needs-review`: phase-reviewer または verifier の確認待ち。
- `needs-human`: 人間の判断待ち。
- `blocked`: 外部要因で停止中。
- `verification-failed`: 検証または review gate が失敗した。
- `loop-improvement`: 振り返りから生まれた loop、test、prompt、automation、review、tooling、documentation の改善対象。
- `needs-retro`: PJ 最後または milestone/release 前の振り返りで集約する対象。
- `capability-expansion`: 既存 skill、agent、automation prompt、loop policy では足りず、能力拡張を改善手段として扱う対象。
- `skill-gap`: 新規 skill または既存 skill の拡張が必要な対象。
- `agent-gap`: 新規 agent または既存 agent の責務調整が必要な対象。
- `github-linked`: GitHub branch、commit、PR のいずれかが紐づいている。
- `phase-planning`
- `phase-red`
- `phase-green`
- `phase-refactor`
- `phase-verify`

## 状態遷移

状態遷移は Comment とセットで行う。status だけを動かさない。

標準遷移:

- `Backlog -> Todo`: triage が完了し、実行可能になった。
- `Todo -> In Progress`: エージェントが claim し、作業を開始した。
- `In Progress -> In Review`: 設計、テスト、実装、リファクタリング、検証のいずれかで review gate 待ちになった。
- `In Review -> In Progress`: レビュー担当が `REJECT` し、修正が必要になった。
- `In Review -> Done`: 受け入れ証跡を含む最終検証と review gate が `APPROVE` になった。
- `Any -> Todo`: blocker が解消し、再実行可能になった。
- `Any -> Canceled`: 人間または project policy が中止を決めた。
- `Any -> Duplicate`: 重複 issue と判定した。

claim の扱い:

- project policy が controller-only claim を定義している場合、controller だけが claim を適用する。
- controller は claim 直前に Issue を再読み込みし、status、labels、最新 Comment が discovery scope と矛盾しないことを確認する。
- claim は status 変更、`agent-active` label、`ready-for-agent` label の削除、Comment の追記をセットで扱う。
- 再読み込み時に `blocked`、`needs-human`、`agent-active`、`needs-review` など除外 label が見つかった場合は、その Issue を変更せず次候補へ移る。
- claim できなかった Issue を無理に作業せず、候補がなければ no-op または escalation として記録する。

人間判断が必要な場合:

- status は原則 `In Review` にする。
- label に `needs-human` を付ける。
- Comment に具体的な質問、選択肢、blocking reason を書く。

検証失敗または review failure の場合:

- status は `In Progress` または `In Review` に戻す。
- label に `verification-failed` または `needs-review` を付ける。
- Comment に failed criteria と required next action を書く。

## 状態更新権限

全エージェントが自由に status を動かしてはいけない。役割ごとに許可範囲を分ける。`.codex/loop.toml` などの project policy がより狭い権限境界を定義している場合は、必ず project policy を優先する。

- Triage: `Backlog -> Todo`、`needs-triage` / `ready-for-agent` の更新案を作成してよい。project policy が明示的に許可する場合だけ直接更新してよい。
- Triage が read-only agent として設定されている場合は、status / label / Comment の更新案だけを返し、コントローラーが証拠を確認して適用する。
- Implementer: phase label、検証結果、GitHub link の記録案を作成してよい。project policy が controller-only mutation または controller-only claim を定義している場合は、Linear や GitHub を直接更新せずコントローラーへの提案として返す。
- 工程レビュー担当: `In Progress -> In Review` の確認結果を Comment に記録する提案を作成し、`needs-review` / `verification-failed` を提案してよい。status 更新は project policy が許可する場合だけ行う。
- Verifier: 最終 `APPROVE` の場合に `In Review -> Done` を提案してよい。`REJECT` の場合は `In Progress` へ戻す提案をしてよい。status 更新は project policy が許可する場合だけ行う。
- 人間 / コントローラー: すべての状態遷移を行ってよい。

project policy が未定義の場合の安全な default:

- エージェントは Comment と label の更新案を作成する。直接更新は、その role に明示的に許可された場合だけ行う。
- `Done`、`Canceled`、`Duplicate` への status 変更は controller、verifier、または人間に寄せる。

## コメント内容

各エージェントの Comment は、実際に発生した項目だけを含める。

```md
## エージェント実行

エージェント:
アクション:
結果: DONE | PARTIAL | APPROVE | REJECT | ESCALATE
根拠:
次:
```

工程レビューを記録する場合は、次の形式を使う。

```md
## 工程レビュー

工程:
実行者:
レビュー担当:
判定: APPROVE | REJECT | ESCALATE
根拠:
必要な次アクション:
残るリスク:
```

GitHub 連携を記録する場合は、次の形式を使う。

```md
## GitHub 連携

Linear Issue:
ブランチ:
コミット:
Pull Request:
CI:
連携方法:
メモ:
```

状態遷移を記録する場合は、次の形式を使う。

```md
## 状態遷移

変更前:
変更後:
追加したラベル:
削除したラベル:
理由:
根拠:
次:
```

関連 work、branch、commit、pull request、log、artifact を参照する場合は、link または issue identifier を使う。

## 役割ごとの挙動

- Triage: 候補 Issue、優先度、readiness、人間向け確認事項、Linear 更新提案を作成する。read-only agent として動く場合は直接更新しない。
- Explorer: findings、関連ファイル、constraints、risks、recommended next action を記録する。
- Implementer: changed files、behavior changes、実行した verification、remaining risks を記録する。
- Verifier: 受け入れ条件に対する証拠とともに `APPROVE`、`REJECT`、`ESCALATE` を記録する。
- 工程レビュー担当: 設計、テスト、実装、リファクタリング、最終検証の各工程後に、担当エージェントとは別エージェントとして `APPROVE`、`REJECT`、`ESCALATE` を記録する。
- GitHub Operator: branch、commit、PR、CI run、review comment を Linear issue に紐づけ、URL または identifier を記録する。

## 状態変更

この Skill の状態機械を default として使う。Linear Document または user request に project 固有の状態遷移ルールがある場合は、それを優先する。

安全な default:

- Agents は Comments の追記案を作成してよい。直接追記は project policy または user request が許可している場合だけ行う。
- Agents は自分の作業を説明する links の追加案を作成してよい。直接追加は project policy または user request が許可している場合だけ行う。
- project policy または状態更新権限がその role に許可していない限り、Agents は status 移動、issue close、owner 変更をしない。
- controller-only claim が定義されている場合、controller 以外の Agents は `agent-active` 付与や `In Progress` への遷移を直接行わない。
- Human escalation は、labels や statuses が未設定でも、最低限 Comment として見える状態にする。

## 最終応答

Linear memory に書き込んだ後の最終応答には、次だけを含める。

- 短い結果。
- 更新した Linear Issue または Comment。
- 残るリスクまたは人間の判断が必要な事項。
