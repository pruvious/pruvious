import { fillObjectDeep } from '@pruvious/utils'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import pc from 'picocolors'
import { Observable, Subject, lastValueFrom, takeUntil } from 'rxjs'
import { SpawnOptions } from './spawn.types'
import { Message } from './types'

export class Spawn {
  protected options: SpawnOptions

  public process: ChildProcessWithoutNullStreams

  get output$(): Observable<Message> {
    return this._output$.asObservable()
  }

  protected _output$ = new Subject<Message>()

  protected unsubscribeAll$ = new Subject<void>()

  constructor(options: SpawnOptions) {
    this.options = fillObjectDeep(options, {
      ...options,

      // Default options
      cwd: undefined,
      env: {},
      showOutput: false,
      outputPrefix: '',
    })
  }

  run(): this {
    this.process = spawn(this.options.command, [], {
      shell: true,
      stdio: 'pipe',
      cwd: this.options.cwd,
      env: { ...process.env, FORCE_COLOR: '1', ...this.options.env },
    })

    this.process.stdout.setEncoding('utf8')
    this.process.stderr.setEncoding('utf8')

    this.process.stdout.on('data', (data) => this.onData(data))
    this.process.stderr.on('data', (data) => this.onData(data, true))

    this.process.on('close', () => {
      this.unsubscribeAll$.next()
      this.unsubscribeAll$.complete()
    })

    return this
  }

  expectOutput(pattern: RegExp): Promise<void> {
    const subject$ = new Subject<void>()

    this._output$.pipe(takeUntil(subject$), takeUntil(this.unsubscribeAll$)).subscribe((output) => {
      if (pattern.test(output.text)) {
        subject$.next()
        subject$.complete()
      }
    })

    this.unsubscribeAll$.pipe(takeUntil(subject$)).subscribe(() => {
      if (!subject$.closed) {
        console.log('')
        console.log(
          pc.bgRed(' Fatal '),
          `Process "${this.options.command}" closed without output matching pattern ${pc.red(
            pattern.toString(),
          )}`,
        )

        process.exit(1)
      }
    })

    return lastValueFrom(subject$)
  }

  protected onData(data: any, isError: boolean = false): void {
    data
      .toString()
      .replace(/\r?\n$/, '')
      .split(/\r?\n/)
      .forEach((text: string) => {
        const output: Message = {
          timestamp: Date.now(),
          text: this.options.outputPrefix + text,
          color: isError ? 'red' : undefined,
        }

        this._output$.next(output)

        if (this.options.showOutput) {
          if (this.options.outputPrefix) {
            console.log(pc.gray(this.options.outputPrefix) + pc.reset('‎'), text)
          } else {
            console.log(text)
          }
        }
      })
  }
}
