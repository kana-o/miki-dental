#!/usr/bin/env node

/**
 * 画像自動リネーム＆フォルダ振り分けスクリプト（クロスプラットフォーム）
 *
 * Figma MCPでダウンロードしたハッシュ名画像をリネームし、
 * 複数ページ案件では --page 指定で自動的にページ/共通フォルダに振り分けます。
 *
 * 前提:
 *   - 2倍書き出しは Figma 側で対応（Export設定 Scale=2x）
 *   - 圧縮は Gulp の imagemin が自動実行
 *   - このスクリプトは「リネーム」と「フォルダ振り分け」のみを担当
 *
 * 使用方法:
 *   node .coding-md/02-image-export/auto-rename-images.cjs <画像ルート> [オプション]
 *
 * オプション:
 *   --page <名前>              振り分け先ページフォルダ名（複数ページ案件のみ）。
 *                              指定時: common_* → <ルート>/common/、その他 → <ルート>/<名前>/
 *                              未指定: <ルート>直下にリネームするだけ（1ページ案件用）
 *   --mapping <JSONファイル>   MCP取得時の画像マッピング情報（省略時は対話形式）
 *   --dry-run                  実際には実行せず、処理内容を表示
 *   --prefix <名前>            ファイル名のプレフィックス入力時のデフォルト
 *
 * 例:
 *   # 1ページ案件
 *   node .coding-md/02-image-export/auto-rename-images.cjs src/img
 *
 *   # 複数ページ案件: aboutページの画像をリネーム＋振り分け
 *   node .coding-md/02-image-export/auto-rename-images.cjs src/img --page about
 *
 *   # ドライラン
 *   node .coding-md/02-image-export/auto-rename-images.cjs src/img --page about --dry-run
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    directory: null,
    mapping: null,
    page: null,
    dryRun: false,
    prefix: null
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      switch (args[i]) {
        case '--mapping':
          options.mapping = args[++i]
          break
        case '--page':
          options.page = args[++i]
          break
        case '--dry-run':
          options.dryRun = true
          break
        case '--prefix':
          options.prefix = args[++i]
          break
      }
    } else if (!options.directory) {
      options.directory = args[i]
    }
  }

  return options
}

// 振り分け先のディレクトリを決定
//   --page 未指定: そのままルート直下
//   --page 指定 + common_* 始まり: <ルート>/common/
//   --page 指定 + その他: <ルート>/<page>/
function resolveDestDir(rootDir, fileName, page) {
  if (!page) return rootDir
  if (fileName.startsWith('common_') || fileName.startsWith('common-')) {
    return path.join(rootDir, 'common')
  }
  return path.join(rootDir, page)
}

// ディレクトリを作成（存在すれば何もしない）
function ensureDir(dir, dryRun = false) {
  if (fs.existsSync(dir)) return
  if (dryRun) {
    console.log(`    [DRY-RUN] mkdir: ${dir}`)
  } else {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// ハッシュ名ファイルを検出（40文字の16進数）
function findHashFiles(directory) {
  const files = fs.readdirSync(directory)
  const hashPattern = /^[0-9a-f]{40}\.(png|jpg|jpeg|svg|webp)$/i

  return files
    .filter(file => hashPattern.test(file))
    .map(file => ({
      name: file,
      path: path.join(directory, file),
      ext: path.extname(file).toLowerCase()
    }))
}

// 対話形式でリネーム情報を取得
async function interactiveRename(hashFiles, directory, options) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve))

  console.log('\n📋 ハッシュ名ファイル一覧:')
  hashFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}`)
  })

  console.log(`\n🖼️  画像を確認するには、エクスプローラーで開いてください: ${path.resolve(directory)}`)

  const renameMap = []
  let counter = 1

  for (const file of hashFiles) {
    console.log(`\n--- ${file.name} ---`)

    const action = await question('  アクション (r=リネーム, s=スキップ, d=削除, q=終了): ')

    if (action === 'q') break
    if (action === 's') continue
    if (action === 'd') {
      renameMap.push({ ...file, action: 'delete' })
      continue
    }

    if (action === 'r') {
      const defaultPrefix = options.prefix || 'img'
      const newName = await question(`  新しいファイル名 (拡張子なし、例: ${defaultPrefix}_${String(counter).padStart(2, '0')}): `)

      if (newName) {
        renameMap.push({
          ...file,
          action: 'rename',
          newName: newName + file.ext
        })
        counter++
      }
    }
  }

  rl.close()
  return renameMap
}

// マッピングファイルからリネーム情報を取得
function loadMappingFile(mappingPath) {
  try {
    const content = fs.readFileSync(mappingPath, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.error(`❌ マッピングファイル読み込みエラー: ${e.message}`)
    return null
  }
}

// 自動マッピング（MCPレスポンスのassets情報から）
function autoMapFromMcpAssets(assetsInfo, hashFiles) {
  /**
   * MCPの get_design_context レスポンスの assets 部分を解析
   * 形式例:
   * {
   *   "downloadUrls": {
   *     "node_123:456": "https://...",
   *     "hero_image": "https://..."
   *   }
   * }
   */
  const renameMap = []
  
  if (!assetsInfo || !assetsInfo.downloadUrls) {
    return renameMap
  }

  // URLからハッシュを抽出して対応付け
  for (const [nodeName, url] of Object.entries(assetsInfo.downloadUrls)) {
    // URLからファイル名を抽出
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    // ハッシュファイルと照合
    const matchingFile = hashFiles.find(f => f.name === fileName || url.includes(f.name.split('.')[0]))
    
    if (matchingFile) {
      // ノード名をファイル名に変換（スペースをアンダースコアに、特殊文字を除去）
      const safeName = nodeName
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
      
      renameMap.push({
        ...matchingFile,
        action: 'rename',
        newName: safeName + matchingFile.ext,
        nodeName: nodeName
      })
    }
  }

  return renameMap
}

// リネーム実行
function executeRename(renameMap, directory, options) {
  console.log('\n🔄 リネーム処理を実行中...\n')

  for (const item of renameMap) {
    const oldPath = item.path

    if (item.action === 'delete') {
      if (options.dryRun) {
        console.log(`  [DRY-RUN] 削除: ${item.name}`)
      } else {
        fs.unlinkSync(oldPath)
        console.log(`  🗑️  削除: ${item.name}`)
      }
      continue
    }

    if (item.action === 'rename') {
      const destDir = resolveDestDir(directory, item.newName, options.page)
      const newPath = path.join(destDir, item.newName)
      const relDest = path.relative(directory, newPath) || item.newName

      console.log(`  📝 ${item.name} → ${relDest}`)

      if (options.dryRun) continue

      ensureDir(destDir, false)
      fs.renameSync(oldPath, newPath)
    }
  }
}

// ハッシュファイル一括削除
function cleanupHashFiles(directory, dryRun = false) {
  const hashFiles = findHashFiles(directory)
  
  if (hashFiles.length === 0) {
    console.log('  ✅ 削除対象のハッシュファイルはありません')
    return
  }

  for (const file of hashFiles) {
    if (dryRun) {
      console.log(`  [DRY-RUN] 削除: ${file.name}`)
    } else {
      fs.unlinkSync(file.path)
      console.log(`  🗑️  削除: ${file.name}`)
    }
  }
}

// メイン処理
async function main() {
  const options = parseArgs()

  if (!options.directory) {
    console.log(`
画像自動リネーム＆フォルダ振り分けスクリプト

使用方法:
  node auto-rename-images.cjs <画像ルート> [オプション]

オプション:
  --page <名前>              振り分け先ページフォルダ名（複数ページ案件のみ）
                             common_* → <ルート>/common/、その他 → <ルート>/<名前>/
  --mapping <JSONファイル>   MCP取得時の画像マッピング情報
  --dry-run                  実際には実行せず、処理内容を表示
  --prefix <名前>            ファイル名のプレフィックス

例:
  # 1ページ案件
  node auto-rename-images.cjs src/img

  # 複数ページ案件: aboutページ
  node auto-rename-images.cjs src/img --page about

  # ドライラン
  node auto-rename-images.cjs src/img --page about --dry-run
    `)
    process.exit(1)
  }

  // ディレクトリ存在確認
  if (!fs.existsSync(options.directory)) {
    console.error(`❌ ディレクトリが存在しません: ${options.directory}`)
    process.exit(1)
  }

  console.log('🖼️  画像自動リネーム＆振り分けスクリプト')
  console.log(`   ルート: ${options.directory}`)
  if (options.page) {
    console.log(`   振り分け: common_* → ${options.directory}/common/、その他 → ${options.directory}/${options.page}/`)
  } else {
    console.log(`   振り分け: なし（ルート直下にリネームのみ）`)
  }
  console.log(`   DRY-RUN: ${options.dryRun ? 'ON' : 'OFF'}`)

  // ハッシュファイルを検出
  const hashFiles = findHashFiles(options.directory)
  
  if (hashFiles.length === 0) {
    console.log('\n✅ ハッシュ名のファイルはありません（リネーム済みか、画像がない可能性）')
    process.exit(0)
  }

  console.log(`\n📁 ハッシュファイル: ${hashFiles.length}件検出`)

  let renameMap = []

  // マッピングファイルがある場合
  if (options.mapping) {
    const mapping = loadMappingFile(options.mapping)
    if (mapping) {
      renameMap = autoMapFromMcpAssets(mapping, hashFiles)
      console.log(`   マッピングから ${renameMap.length}件の対応を検出`)
    }
  }

  // マッピングがない or 不完全な場合は対話形式
  if (renameMap.length < hashFiles.length) {
    console.log('\n📝 対話形式でリネーム情報を入力してください')
    renameMap = await interactiveRename(hashFiles, options.directory, options)
  }

  // 実行
  if (renameMap.length > 0) {
    executeRename(renameMap, options.directory, options)
  }

  // 残りのハッシュファイルを確認
  const remainingHash = findHashFiles(options.directory)
  if (remainingHash.length > 0) {
    console.log(`\n⚠️ 未処理のハッシュファイルが ${remainingHash.length}件残っています`)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => 
      rl.question('すべて削除しますか? (y/n): ', resolve)
    )
    rl.close()
    
    if (answer === 'y') {
      cleanupHashFiles(options.directory, options.dryRun)
    }
  }

  console.log('\n✅ 完了!')
}

main().catch(console.error)
