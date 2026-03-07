import { RGBA, SyntaxStyle } from '@opentui/core'
import type { LanguageModelUsage } from 'ai'
import { Show } from 'solid-js'

export function createMarkdownSyntaxStyle(): SyntaxStyle {
  return SyntaxStyle.fromStyles({
    // ========== Markdown 基础样式 ==========

    // 默认文本
    default: {
      fg: RGBA.fromHex('#E6EDF3'), // 浅白色
    },

    // 标题 H1-H6
    'markup.heading.1': {
      fg: RGBA.fromHex('#58A6FF'), // 蓝色
      bold: true,
    },
    'markup.heading.2': {
      fg: RGBA.fromHex('#58A6FF'), // 蓝色
      bold: true,
    },
    'markup.heading.3': {
      fg: RGBA.fromHex('#79C0FF'), // 浅蓝色
      bold: true,
    },
    'markup.heading.4': {
      fg: RGBA.fromHex('#79C0FF'), // 浅蓝色
      bold: true,
    },
    'markup.heading.5': {
      fg: RGBA.fromHex('#A5D6FF'), // 更浅的蓝色
      bold: true,
    },
    'markup.heading.6': {
      fg: RGBA.fromHex('#A5D6FF'), // 更浅的蓝色
      // 注意：去掉 italic，用户反馈 H6 不应斜体
    },

    // 行内代码 / 代码块
    'markup.raw': {
      fg: RGBA.fromHex('#A5D6FF'), // 浅蓝色背景感的文字
      bg: RGBA.fromHex('#21262d'), // 深色背景
    },
    'markup.raw.block': {
      fg: RGBA.fromHex('#A5D6FF'),
      bg: RGBA.fromHex('#161b22'), // 更深的背景用于代码块
    },

    // 强调样式
    'markup.strong': {
      fg: RGBA.fromHex('#FFB757'), // 橙色强调
      bold: true,
    },
    'markup.italic': {
      fg: RGBA.fromHex('#D2A8FF'), // 紫色斜体
      italic: true,
    },
    // 注意：粗斜体 (***text***) Tree-sitter 不原生支持组合样式
    // 可以给 strong 加 italic 试试，但效果可能不稳定
    'markup.strikethrough': {
      fg: RGBA.fromHex('#8B949E'), // 灰色删除线
      dim: true,
    },

    // 链接
    'markup.link': {
      fg: RGBA.fromHex('#58A6FF'), // 蓝色链接
      underline: true,
    },
    'markup.link.url': {
      fg: RGBA.fromHex('#79C0FF'), // 浅蓝 URL
      underline: true,
    },
    'markup.link.label': {
      fg: RGBA.fromHex('#D2A8FF'), // 紫色标签
    },

    // 列表
    'markup.list': {
      fg: RGBA.fromHex('#FF7B72'), // 红色列表标记
    },
    'markup.list.unchecked': {
      fg: RGBA.fromHex('#8B949E'), // 灰色未选中
    },
    // 修复：添加已勾选的任务列表样式
    'markup.list.checked': {
      fg: RGBA.fromHex('#3FB950'), // 绿色已勾选
    },

    // 引用块
    'markup.quote': {
      fg: RGBA.fromHex('#8B949E'), // 灰色引用文字
      italic: true,
    },

    // 修复：添加分割线样式 (thematic_break -> punctuation.special)
    'punctuation.special': {
      fg: RGBA.fromHex('#30363D'), // 深灰色分割线
    },

    // ========== 代码高亮样式 (Tree-sitter) ==========

    // 关键字
    keyword: {
      fg: RGBA.fromHex('#FF7B72'), // 红色关键字
      bold: true,
    },

    // 字符串
    string: {
      fg: RGBA.fromHex('#A5D6FF'), // 浅蓝色字符串
    },

    // 注释
    comment: {
      fg: RGBA.fromHex('#8B949E'), // 灰色注释
      italic: true,
    },

    // 数字/常量
    number: {
      fg: RGBA.fromHex('#79C0FF'), // 蓝色数字
    },
    constant: {
      fg: RGBA.fromHex('#79C0FF'),
    },

    // 函数
    function: {
      fg: RGBA.fromHex('#D2A8FF'), // 紫色函数
    },
    'entity.name.function': {
      fg: RGBA.fromHex('#D2A8FF'),
    },

    // 变量
    variable: {
      fg: RGBA.fromHex('#FFA657'), // 橙色变量
    },

    // 类型
    type: {
      fg: RGBA.fromHex('#FFA657'), // 橙色类型
    },
    'entity.name.type': {
      fg: RGBA.fromHex('#FFA657'),
    },

    // 操作符
    operator: {
      fg: RGBA.fromHex('#FF7B72'), // 红色操作符
    },

    // 标点
    punctuation: {
      fg: RGBA.fromHex('#C9D1D9'), // 浅灰标点
    },

    // 属性
    property: {
      fg: RGBA.fromHex('#79C0FF'), // 蓝色属性
    },

    // 标签
    tag: {
      fg: RGBA.fromHex('#7EE787'), // 绿色标签
    },

    // 属性名 (HTML/CSS)
    'entity.other.attribute-name': {
      fg: RGBA.fromHex('#FFA657'),
    },

    // 标签 (尝试支持下划线 HTML 标签)
    underline: {
      fg: RGBA.fromHex('#E6EDF3'),
      underline: true,
    },
  })
}

const markdownSyntaxStyle = createMarkdownSyntaxStyle()

export function getSyntaxStyle(): SyntaxStyle {
  return markdownSyntaxStyle
}

function getTokenDisplay(usage: LanguageModelUsage | null) {
  if (usage === null) return 'Tokens: null'
  return `Tokens: ${usage.totalTokens}(input: ${usage.inputTokens}, output: ${usage.outputTokens})`
}

export function BotMessage({ content, reason, streaming, usage }: { content: string; reason: string; streaming: boolean; usage: LanguageModelUsage | null }) {
  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} width="100%">
      <Show when={reason}>
        <box width="100%" marginBottom={1}>
          <text >
            <span style={{ fg: '#909399' }}>Thinking: </span>
            <span style={{ fg: '#888' }}>{reason}</span>
          </text>
        </box>
      </Show>
      <markdown syntaxStyle={markdownSyntaxStyle} content={content} streaming={streaming} />
      <Show when={usage !== null}> 
        <box>
          <text style={{ fg: '#888' }}>{getTokenDisplay(usage)}</text>
        </box>
      </Show>
    </box>
  )
}

export default BotMessage
