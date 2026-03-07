export function UserMessage({ content }: { content: string }) {
  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width="100%"
      border={['left']}
      borderColor="#3b82f6"
      borderStyle="heavy"
      backgroundColor="#1a1a1a"
    >
      <text fg="#ffffff">{content}</text>
    </box>
  )
}

export default UserMessage
