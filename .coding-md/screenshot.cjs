#!/usr/bin/env node

/**
 * ブラウザのスクリーンショットを自動取得するスクリプト（Playwright使用）
 *
 * 使用方法:
 *   node coding-md/screenshot.cjs [オプション]
 *
 * オプション:
 *   --url <URL>           対象URL（省略時は自動検出）
 *   --selector <セレクタ>  キャプチャするCSSセレクタ（例: ".l-footer", "#header"）
 *   --viewport <サイズ>    ビューポート（sp, tab, pc, both, all）デフォルト: sp
 *                           sp   = 375x812
 *                           tab  = 1024x768（タブレット中間幅の崩れ確認用）
 *                           pc   = 1440x900
 *                           both = sp + pc を順番にキャプチャ
 *                           all  = sp + tab + pc を順番にキャプチャ
 *   --output <パス>        出力ディレクトリ（省略時は自動設定）
 *   --compare <画像パス>   比較対象のFigmaデザイン画像パス
 *   --name <名前>          出力ファイル名のプレフィックス（デフォルト: screenshot）
 *
 * 例:
 *   node coding-md/screenshot.cjs --selector ".l-footer" --viewport sp
 *   node coding-md/screenshot.cjs --selector ".l-header" --viewport both --name header
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

// スクリプトのディレクトリを基準にパスを解決
const SCRIPT_DIR = __dirname
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..')

/**
 * 開発サーバーのURLを自動検出
 */
function detectDevServerUrl() {
  // 1. よく使われるポートを試行
  const commonPorts = [3000, 5173, 8080, 4000, 8000, 10210]

  // 2. package.jsonからポートを推測
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const scripts = packageJson.scripts || {}

      // scriptsからポート番号を抽出
      for (const script of Object.values(scripts)) {
        const portMatch = script.match(
          /--port[=\s]+(\d+)|port[=:]\s*(\d+)|-p\s+(\d+)/i
        )
        if (portMatch) {
          const port = portMatch[1] || portMatch[2] || portMatch[3]
          if (port) {
            commonPorts.unshift(parseInt(port))
          }
        }
      }
    } catch (e) {
      // パース失敗は無視
    }
  }

  // 3. vite.config.js/tsからポートを推測
  const viteConfigFiles = ['vite.config.js', 'vite.config.ts']
  for (const configFile of viteConfigFiles) {
    const configPath = path.join(PROJECT_ROOT, configFile)
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8')
        const portMatch = content.match(/port[:\s]+(\d+)/)
        if (portMatch) {
          commonPorts.unshift(parseInt(portMatch[1]))
        }
      } catch (e) {
        // 読み取り失敗は無視
      }
    }
  }

  // 重複を除去
  const uniquePorts = [...new Set(commonPorts)]

  return {
    ports: uniquePorts,
    defaultUrl: `http://localhost:${uniquePorts[0]}`
  }
}

/**
 * ポートが開いているか確認
 */
async function checkPort(port) {
  return new Promise((resolve) => {
    const http = require('http')
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(1000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * 利用可能なサーバーを探す
 */
async function findAvailableServer(ports) {
  for (const port of ports) {
    if (await checkPort(port)) {
      return `http://localhost:${port}`
    }
  }
  return null
}

// コマンドライン引数のパース
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    url: null, // 自動検出
    selector: null,
    viewport: 'sp',
    output: path.join(SCRIPT_DIR, 'screenshots'),
    compare: null,
    name: 'screenshot'
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        options.url = args[++i]
        break
      case '--selector':
        options.selector = args[++i]
        break
      case '--viewport':
        options.viewport = args[++i]
        break
      case '--output':
        options.output = args[++i]
        break
      case '--compare':
        options.compare = args[++i]
        break
      case '--name':
        options.name = args[++i]
        break
    }
  }

  return options
}

// ビューポートサイズ
const VIEWPORTS = {
  sp: { width: 375, height: 812 },
  tab: { width: 1024, height: 768 },     // タブレット中間幅（PC〜SP間の崩れ確認用）
  pc: { width: 1440, height: 900 },      // Figmaデザイン幅に合わせる
  pc_wide: { width: 1920, height: 1080 } // ワイド版
}

// 出力ディレクトリの作成
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// タイムスタンプ生成
function getTimestamp() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
}

// セクションのスクリーンショットを取得
async function captureSection(page, selector, outputPath) {
  try {
    const element = await page.$(selector)
    if (element) {
      await element.screenshot({ path: outputPath })
      console.log(`  ✅ セクション "${selector}" を保存: ${outputPath}`)
      return true
    } else {
      console.log(`  ⚠️ セクション "${selector}" が見つかりません`)
      return false
    }
  } catch (error) {
    console.error(`  ❌ エラー: ${error.message}`)
    return false
  }
}

// フルページのスクリーンショットを取得
async function captureFullPage(page, outputPath) {
  await page.screenshot({
    path: outputPath,
    fullPage: true,
    type: 'png'
  })
  console.log(`  ✅ フルページを保存: ${outputPath}`)
}

// メイン処理
;(async () => {
  const options = parseArgs()
  const timestamp = getTimestamp()

  console.log('📸 スクリーンショット取得を開始')

  // URL自動検出
  let url = options.url
  if (!url) {
    console.log('   🔍 開発サーバーを自動検出中...')
    const { ports } = detectDevServerUrl()
    url = await findAvailableServer(ports)

    if (!url) {
      console.error('   ❌ 開発サーバーが見つかりません')
      console.error('      以下のいずれかを実行してください:')
      console.error('      1. 開発サーバーを起動する（npm run dev など）')
      console.error('      2. --url オプションでURLを指定する')
      process.exit(1)
    }
    console.log(`   ✅ サーバー検出: ${url}`)
  }

  console.log(`   URL: ${url}`)
  console.log(`   セレクタ: ${options.selector || '全体'}`)
  console.log(`   ビューポート: ${options.viewport}`)
  console.log(`   出力先: ${options.output}`)

  ensureDir(options.output)

  const browser = await chromium.launch({ headless: true })

  try {
    const viewportsToCapture =
      options.viewport === 'both' ? ['sp', 'pc'] :
      options.viewport === 'all' ? ['sp', 'tab', 'pc'] :
      [options.viewport]

    for (const vpName of viewportsToCapture) {
      const vp = VIEWPORTS[vpName] || VIEWPORTS.sp
      console.log(`\n📱 ${vpName.toUpperCase()} (${vp.width}x${vp.height})`)

      const page = await browser.newPage()
      await page.setViewportSize(vp)

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // セレクタ指定がある場合
      if (options.selector) {
        const outputPath = path.join(
          options.output,
          `${options.name}_${vpName}_${timestamp}.png`
        )
        await captureSection(page, options.selector, outputPath)
      }
      // 全体キャプチャ
      else {
        const outputPath = path.join(
          options.output,
          `${options.name}_fullpage_${vpName}_${timestamp}.png`
        )
        await captureFullPage(page, outputPath)
      }

      await page.close()
    }

    // 比較画像がある場合 → 自動差分比較を実行
    if (options.compare && fs.existsSync(options.compare)) {
      console.log(`\n📊 差分比較を実行中...`)
      console.log(`   比較対象: ${options.compare}`)
      
      // 最新のスクリーンショットを取得
      const screenshotFiles = fs.readdirSync(options.output)
        .filter(f => f.startsWith(options.name) && f.endsWith('.png'))
        .sort()
        .reverse()
      
      if (screenshotFiles.length > 0) {
        const latestScreenshot = path.join(options.output, screenshotFiles[0])
        const compareScript = path.join(SCRIPT_DIR, '05-screenshot-comparison', 'compare-screenshots.cjs')
        
        if (fs.existsSync(compareScript)) {
          try {
            execSync(`node "${compareScript}" "${latestScreenshot}" "${options.compare}" --report`, {
              stdio: 'inherit',
              cwd: PROJECT_ROOT
            })
          } catch (e) {
            console.log('   ⚠️ 差分比較でエラーが発生しました')
          }
        } else {
          console.log('   ⚠️ 差分比較スクリプトが見つかりません')
          console.log(`      期待パス: ${compareScript}`)
          
          // フォールバック: 手動確認用にコピー
          const compareName = path.basename(options.compare)
          const compareOutput = path.join(
            options.output,
            `compare_figma_${timestamp}_${compareName}`
          )
          fs.copyFileSync(options.compare, compareOutput)
          console.log(`   Figmaデザインをコピー: ${compareOutput}`)
        }
      }
    }

    console.log('\n✅ 完了!')
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
})()
