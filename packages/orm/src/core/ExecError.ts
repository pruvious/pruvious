interface IExecError {
  /**
   * The SQL query that triggered the error.
   */
  sql: string

  /**
   * Optional array or object of bind parameters used in the SQL query.
   */
  params?: any[] | Record<string, any>
}

export class ExecError extends Error implements IExecError {
  constructor(
    original: unknown,
    public sql: string,
    public params?: any[] | Record<string, any>,
  ) {
    if (original instanceof Error) {
      super(original.message, { cause: original.cause })
    } else {
      super('An error occurred while executing the SQL query.')
    }

    this.name = 'ExecError'
  }
}
