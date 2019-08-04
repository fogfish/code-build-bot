//
//
class Text {
  
  static f(str: TemplateStringsArray, ...args: Array<any>) {
    return <A>(...props: Array<A>): string => {
      const parsed = args.map((x, index) => (typeof x === 'function' ? x(props[index]) : x))
      if (parsed.some(x => x === undefined)) {
        return ''
      }
      return str.reduce((acc, substr, index) => acc + this.text(parsed[index - 1]) + substr)
    }
  }

  static text(x: any): string {
    if (Array.isArray(x)) {
      return `(${x.map(this.text)})`
    }
    return this.stringify(x)
  }

  static stringify(x: any): string {
    return String(x)
  }
}


export namespace message {
  export const empty = ''
  export const aborted = 'build aborted, check either repo or bot config'

  export const release = Text.f`Release ${rel => rel}`
  export const pending = Text.f`Build is [pending](${logs => logs})`
  export const success = Text.f`Build is [done](${logs => logs})`

  export const failureBuild = Text.f`Build ${t => t} is failed.`
  export const failureRelease = Text.f`Release ${rel => rel} at ${t => t} is failed.`
  export const failureFree = Text.f`Clean up of PR ${pr => pr} is failed.`
  export const failureCausedBy = Text.f`Caused by **Pull Request** #${pr => pr}, See [build logs](${url => url})

\`\`\`javascript
${json => json}
\`\`\`
`
  export const failure = Text.f`See [build logs](${url => url})

\`\`\`javascript
${json => json}
\`\`\`
`

}
