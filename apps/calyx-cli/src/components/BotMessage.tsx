import { RGBA, SyntaxStyle } from '@opentui/core'



export function BotMessage({ content }: { content: string }) {
  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} width="100%">
      {/* <markdown syntaxStyle={getSyntaxStyle()} content={content} /> */}
      <text fg="#8473e4">{content}</text>
    </box>
  )
}

export default BotMessage
