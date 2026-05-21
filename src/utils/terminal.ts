export function formatCommandEntry(cmd: string, lines: string[]): string {
  const output = lines.join('\n')
  return output ? `$ ${cmd}\n\n${output}` : `$ ${cmd}`
}
