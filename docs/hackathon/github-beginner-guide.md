# Claude Codeで作ったコードをGitHubで管理する方法
### GitHub未経験者向けガイド（Windows / GitHub Desktop版）

対象：GitもGitHubも初めての人。専用アプリ「GitHub Desktop」にてボタン操作するだけでソース管理を進められます。

---

## 用語集

先に軽く目を通しておくと手順がわかりやすくなります。

| 用語 | 意味 |
|---|---|
| Git | 変更履歴を記録する仕組み |
| GitHub | Gitのデータをネット上で保存・共有するサービス |
| リポジトリ | プロジェクトの保管庫（フォルダのようなもの） |
| コミット | 「ここまでの変更を記録する」操作 |
| プッシュ | 記録した変更をGitHubに送る操作 |
| プル　　 | GitHub側の変更を手元のPCに取り込む操作 |
| クローン | 他人のリポジトリを自分のPCに丸ごとコピーする操作 |
| .gitignore | GitHubに送らないファイルを指定する設定ファイル |

---

## 準備1：GitHubアカウントを作る

1. ブラウザで https://github.com を開く
2. 画面右上にある「**Sign up**」というボタンをクリック
3. 「Email」欄にメールアドレスを入力して「Continue」をクリック
4. 「Password」欄にパスワードを入力して「Continue」をクリック
5. 「Username」欄にユーザー名（半角英数字、他の人が使っていないもの）を入力して「Continue」をクリック
6. 画像や簡単なパズルの認証が出たら指示通りに解く
7. 登録したメールアドレスに届く確認コードを入力する画面が出るので、メールを確認してコードを入力
8. 完了するとGitHubのトップ画面が表示される

---

## 準備2：Gitをインストールする

「Git」はGitHubの裏側で動く仕組みで、先にPCに入れておきます。

1. ブラウザで https://git-scm.com/downloads を開く
2. 「Windows」という文字（リンク）をクリック
3. 少し下にスクロールし「Click here to download」というリンクをクリックしてファイルをダウンロード
4. ダウンロードした`Git-x.xx.x-64-bit.exe`をダブルクリックして実行
5. 「User Account Control（ユーザーアカウント制御）」の確認が出たら「はい」をクリック
6. 以降はすべて画面下部の「**Next**」ボタンをクリックし続ければOK（設定は変更しなくてよい）
7. 最後に「**Install**」→ 完了したら「**Finish**」をクリック

---

## 準備3：GitHub Desktopをインストールする

1. ブラウザで https://desktop.github.com を開く
2. 中央にある「**Download for Windows**」という黒いボタンをクリック
3. ダウンロードした`GitHubDesktopSetup-x64.exe`をダブルクリックして実行
   - ボタンを押すとインストールが自動で始まり、完了するとそのままアプリが起動する（Nextを押す画面はない）
4. 「Sign in to GitHub.com」という画面が出るので、そのボタンをクリック
5. ブラウザが開くのでGitHubにログイン（準備1で作ったメールアドレス・パスワード）し、「Authorize desktop」をクリック
6. 「Continue」をクリックしてGitHub Desktopのアプリ画面に戻る
7. 「Configure Git」という画面が出るので、「Name」欄に自分の名前、「Email」欄にGitHubと同じメールアドレスを入力し、「**Continue**」をクリック
8. 次の画面（Usage data）は「Continue」で進めばOK

これでGitHub Desktopがそのまま使える状態になります。

---

## 準備4：プロジェクトをGitHubに登録する

1. GitHub Desktopを開く
2. 左上の「**File**」メニューをクリックし、「**Add local repository...**」をクリック
3. 「Local path」の右にある「**Choose...**」ボタンをクリックし、プロジェクトのフォルダ（自分で名前を付けたフォルダ）を選んで「フォルダーの選択」
4. 画面下に「This directory does not appear to be a Git repository. Would you like to create a repository here instead?」という青い文字のメッセージが出るので、そこをクリック
5. 「Create a Repository」画面が開くので、内容はそのままで右下の「**Create Repository**」をクリック
6. 画面左側に変更されたファイルの一覧が表示される。画面左下にある「Summary」という入力欄に「Initial commit」など一言を入力
7. その下の青いボタン「**Commit to main**」をクリック
8. 画面上部中央の「**Publish repository**」ボタンをクリック
9. 出てきた画面で、社内プロジェクトの場合は「**Keep this code private**」にチェックが入っていることを確認
10. 「**Publish Repository**」をクリック

これで初回登録は完了です。GitHubのサイトで自分のリポジトリを開くと、アップロードされたファイルが見られます。以降は次の「日常の作業」を繰り返します。

---

## 日常の作業：変更を記録して送る

プロジェクトを編集するたびに、この3ステップを繰り返します。

1. Claude Codeなどでコードを編集する
2. GitHub Desktopを開く（変更されたファイルが自動で一覧表示される）。左下の「Summary」欄に変更内容がわかる一言を入力し、「**Commit to main**」をクリック
3. 画面上部の「**Push origin**」ボタンをクリック（これでGitHubに変更が送信される）

複数人で同じリポジトリを使う場合は、編集を始める前に画面上部の「**Fetch origin**」→（更新があれば）「**Pull origin**」をクリックして、最新の状態にしてから作業する。

---

## 共有する：他の人をリポジトリに招待する（グループのうち一人がやればOK）

1. ブラウザでGitHubの自分のリポジトリページを開く
2. 上部のタブから「**Settings**」をクリック
3. 左側のメニューから「**Collaborators**」をクリック（パスワードの再入力を求められることがある）
4. 「**Add people**」という緑色のボタンをクリック
5. 検索欄に相手のGitHubユーザー名かメールアドレスを入力し、候補が出たらクリックして選択
6. 「**Add [相手の名前] to this repository**」ボタンをクリック

Privateリポジトリは、招待されていない人には存在自体が見えません。

---

## 共有される：招待を受けてコードを取り込む

1. 招待されるとメールが届くので、「**View invitation**」ボタンをクリック
2. ブラウザでGitHubにログインし、「**Accept invitation**」ボタンをクリック
3. GitHub Desktopを開き、左上の「**File**」→「**Clone repository...**」をクリック
4. 「GitHub.com」タブに切り替え、招待されたリポジトリを一覧から探してクリックして選択
5. 「Local path」で保存先フォルダを確認・変更し、「**Clone**」ボタンをクリック

これで自分のPCにプロジェクト一式がコピーされます。以降は「日常の作業」と同じ手順で編集・コミット・プッシュができます。最新の状態にしたいときは「**Fetch origin**」→「**Pull origin**」をクリック。

---

## よくあるつまずき

| 症状 | 対処 |
|---|---|
| 「Commit to main」ボタンが押せない | Summary欄が未入力なのが原因。一言でよいので入力する |
| その他 | つまずいたら都度、AIにやりたいことを支持してみて下さい |

---

## 参考リンク

- GitHub：https://github.com
- Git：https://git-scm.com/downloads
- GitHub Desktop：https://desktop.github.com
- GitHub Docs（日本語）：https://docs.github.com/ja
