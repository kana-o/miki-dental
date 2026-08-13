#!/usr/bin/env node

/**
 * スクリーンショット差分比較ツール
 * 
 * 実装のスクリーンショットとFigmaデザインをピクセル単位で比較し、
 * 差分画像を生成します。差分率も計算して報告します。
 * 
 * 使用方法:
 *   node coding-md/05-screenshot-comparison/compare-screenshots.cjs <実装画像> <デザイン画像> [オプション]
 * 
 * オプション:
 *   --output <パス>       差分画像の出力先（デフォルト: coding-md/screenshots/diff_*.png）
 *   --threshold <0-1>     差分判定の閾値（デフォルト: 0.1）
 *   --report              差分箇所のレポートを生成
 * 
 * 例:
 *   node coding-md/05-screenshot-comparison/compare-screenshots.cjs impl.png design.png
 *   node coding-md/05-screenshot-comparison/compare-screenshots.cjs impl.png design.png --threshold 0.05 --report
 * 
 * 必要なパッケージ:
 *   npm install pixelmatch pngjs
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// PNG.jsとpixelmatchの動的インポート
let PNG, pixelmatch

async function loadDependencies() {
  try {
    const pngjs = require('pngjs')
    PNG = pngjs.PNG
    const pm = require('pixelmatch')
    // ESM default export handling
    pixelmatch = pm.default || pm
  } catch (e) {
    console.log('📦 必要なパッケージをインストール中...')
    try {
      execSync('npm install pixelmatch pngjs', { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..')
      })
      const pngjs = require('pngjs')
      PNG = pngjs.PNG
      const pm = require('pixelmatch')
      pixelmatch = pm.default || pm
    } catch (installError) {
      console.error('❌ パッケージのインストールに失敗しました')
      console.error('手動でインストールしてください: npm install pixelmatch pngjs')
      process.exit(1)
    }
  }
}

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    image1: null,
    image2: null,
    output: null,
    threshold: 0.1,
    report: false
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      switch (args[i]) {
        case '--output':
          options.output = args[++i]
          break
        case '--threshold':
          options.threshold = parseFloat(args[++i])
          break
        case '--report':
          options.report = true
          break
      }
    } else {
      if (!options.image1) {
        options.image1 = args[i]
      } else if (!options.image2) {
        options.image2 = args[i]
      }
    }
  }

  return options
}

// 画像をPNGに変換（JPG/WebP対応・クロスプラットフォーム）
async function ensurePng(imagePath) {
  const ext = path.extname(imagePath).toLowerCase()

  if (ext === '.png') {
    return imagePath
  }

  const tempPng = imagePath.replace(/\.(jpg|jpeg|webp)$/i, '_temp.png')

  // sharp が使えればそれで変換（クロスプラットフォーム）
  let sharp
  try {
    sharp = require('sharp')
  } catch (e) {
    console.error(`❌ ${ext} → PNG 変換には sharp が必要です: ${imagePath}`)
    console.error(`   解決策:`)
    console.error(`     1. PNG を直接渡す（推奨。.page-info/designs/ の規約は PNG）`)
    console.error(`     2. npm install sharp で sharp をインストールする`)
    return null
  }

  try {
    await sharp(imagePath).png().toFile(tempPng)
    return tempPng
  } catch (e) {
    console.error(`❌ 画像変換に失敗: ${imagePath}`)
    console.error(`   ${e.message}`)
    return null
  }
}

// 画像サイズを揃える（大きい方に合わせる）
function matchImageSizes(img1, img2) {
  const maxWidth = Math.max(img1.width, img2.width)
  const maxHeight = Math.max(img1.height, img2.height)
  
  // 新しいPNG画像を作成（白背景）
  function resizeImage(img, newWidth, newHeight) {
    const newImg = new PNG({ width: newWidth, height: newHeight })
    
    // 白で初期化
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const idx = (newWidth * y + x) << 2
        newImg.data[idx] = 255     // R
        newImg.data[idx + 1] = 255 // G
        newImg.data[idx + 2] = 255 // B
        newImg.data[idx + 3] = 255 // A
      }
    }
    
    // 元の画像をコピー
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const srcIdx = (img.width * y + x) << 2
        const dstIdx = (newWidth * y + x) << 2
        newImg.data[dstIdx] = img.data[srcIdx]
        newImg.data[dstIdx + 1] = img.data[srcIdx + 1]
        newImg.data[dstIdx + 2] = img.data[srcIdx + 2]
        newImg.data[dstIdx + 3] = img.data[srcIdx + 3]
      }
    }
    
    return newImg
  }
  
  if (img1.width !== maxWidth || img1.height !== maxHeight) {
    img1 = resizeImage(img1, maxWidth, maxHeight)
  }
  if (img2.width !== maxWidth || img2.height !== maxHeight) {
    img2 = resizeImage(img2, maxWidth, maxHeight)
  }
  
  return { img1, img2, width: maxWidth, height: maxHeight }
}

// PNG画像を読み込み
function loadPng(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function() {
        resolve(this)
      })
      .on('error', reject)
  })
}

// 差分分析レポートを生成（pixelmatch の戻り値 numDiffPixels を信頼）
function generateDiffReport(numDiffPixels, width, height) {
  const totalPixels = width * height
  const diffPercent = ((numDiffPixels / totalPixels) * 100).toFixed(2)

  let summary
  if (numDiffPixels === 0) {
    summary = '✅ 完全一致！差分はありません'
  } else if (parseFloat(diffPercent) < 1) {
    summary = `⚠️ 軽微な差分あり（${diffPercent}%）- 細部の調整が必要`
  } else if (parseFloat(diffPercent) < 5) {
    summary = `🔶 中程度の差分あり（${diffPercent}%）- レイアウトの確認が必要`
  } else {
    summary = `❌ 大きな差分あり（${diffPercent}%）- 全体的な見直しが必要`
  }

  return {
    totalPixels,
    diffPixels: numDiffPixels,
    diffPercent,
    summary
  }
}

// タイムスタンプ生成
function getTimestamp() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
}

// メイン処理
async function main() {
  await loadDependencies()
  
  const options = parseArgs()

  if (!options.image1 || !options.image2) {
    console.log(`
スクリーンショット差分比較ツール

使用方法:
  node compare-screenshots.cjs <実装画像> <デザイン画像> [オプション]

オプション:
  --output <パス>       差分画像の出力先
  --threshold <0-1>     差分判定の閾値（デフォルト: 0.1）
  --report              差分箇所のレポートを生成

例:
  node compare-screenshots.cjs impl.png design.png
  node compare-screenshots.cjs impl.png design.png --threshold 0.05 --report
    `)
    process.exit(1)
  }

  // ファイル存在確認
  if (!fs.existsSync(options.image1)) {
    console.error(`❌ ファイルが見つかりません: ${options.image1}`)
    process.exit(1)
  }
  if (!fs.existsSync(options.image2)) {
    console.error(`❌ ファイルが見つかりません: ${options.image2}`)
    process.exit(1)
  }

  console.log('🔍 スクリーンショット差分比較')
  console.log(`   実装画像: ${options.image1}`)
  console.log(`   デザイン: ${options.image2}`)
  console.log(`   閾値: ${options.threshold}`)

  try {
    // PNGに変換
    const png1Path = await ensurePng(options.image1)
    const png2Path = await ensurePng(options.image2)
    
    if (!png1Path || !png2Path) {
      process.exit(1)
    }

    // 画像読み込み
    console.log('\n📷 画像を読み込み中...')
    let img1 = await loadPng(png1Path)
    let img2 = await loadPng(png2Path)

    console.log(`   実装: ${img1.width}x${img1.height}`)
    console.log(`   デザイン: ${img2.width}x${img2.height}`)

    // サイズが異なる場合は調整
    if (img1.width !== img2.width || img1.height !== img2.height) {
      console.log('\n⚠️ 画像サイズが異なります。サイズを調整中...')
      const matched = matchImageSizes(img1, img2)
      img1 = matched.img1
      img2 = matched.img2
      console.log(`   調整後: ${matched.width}x${matched.height}`)
    }

    // 差分画像を作成
    const { width, height } = img1
    const diff = new PNG({ width, height })

    console.log('\n🔄 差分を計算中...')
    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      { threshold: options.threshold }
    )

    // 出力パス
    const timestamp = getTimestamp()
    const outputPath = options.output || 
      path.join(__dirname, '..', 'screenshots', `diff_${timestamp}.png`)
    
    // 出力ディレクトリ作成
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 差分画像を保存
    diff.pack().pipe(fs.createWriteStream(outputPath))

    // レポート生成
    const report = generateDiffReport(numDiffPixels, width, height)

    console.log('\n📊 結果:')
    console.log(`   ${report.summary}`)
    console.log(`   差分ピクセル: ${numDiffPixels.toLocaleString()} / ${report.totalPixels.toLocaleString()} (${report.diffPercent}%)`)
    console.log(`   差分画像: ${outputPath}`)

    // 詳細レポート
    if (options.report) {
      const reportPath = outputPath.replace('.png', '_report.json')
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        image1: options.image1,
        image2: options.image2,
        width,
        height,
        threshold: options.threshold,
        diffPixels: numDiffPixels,
        totalPixels: report.totalPixels,
        diffPercent: report.diffPercent,
        summary: report.summary
      }, null, 2))
      console.log(`   レポート: ${reportPath}`)
    }

    // 一時ファイルのクリーンアップ
    if (png1Path !== options.image1 && fs.existsSync(png1Path)) {
      fs.unlinkSync(png1Path)
    }
    if (png2Path !== options.image2 && fs.existsSync(png2Path)) {
      fs.unlinkSync(png2Path)
    }

    // 差分がある場合のアドバイス
    if (numDiffPixels > 0) {
      console.log('\n💡 改善のヒント:')
      console.log('   1. 差分画像を確認して、どこが違うか特定')
      console.log('   2. 差分が赤くハイライトされています')
      console.log('   3. AIに差分画像を見せて、具体的な修正箇所を相談')
      console.log(`   \n   例: 「この差分画像を見て、どこを修正すべきか教えて」`)
    }

    console.log('\n✅ 完了!')

  } catch (error) {
    console.error('\n❌ エラー:', error.message)
    process.exit(1)
  }
}

main()
