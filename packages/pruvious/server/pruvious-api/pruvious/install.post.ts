import {
  __,
  deleteFrom,
  insertInto,
  parseBody,
  pruviousError,
  selectFrom,
  setTokenCookies,
  signToken,
} from '#pruvious/server'

export default defineEventHandler(async (event) => {
  const usersCountQuery1 = await selectFrom('Users').count()

  if (!usersCountQuery1.success || usersCountQuery1.data > 0) {
    throw pruviousError(event, {
      message: __('pruvious-api', 'Pruvious is already installed'),
    })
  }

  const { firstName, lastName, email, password } = await parseBody(event, 'object').then(({ input }) => input)
  const createFirstUserQuery = await insertInto('Users')
    .values({ firstName, lastName, email, password, isActive: true, isAdmin: true })
    .returningAll()
    .withCustomContextData({ _ignoreMaskFieldsHook: true })
    .run()

  if (!createFirstUserQuery.success) {
    if (createFirstUserQuery.inputErrors) {
      throw pruviousError(event, {
        statusCode: 422,
        message: __('pruvious-api', 'Invalid input'),
        data: createFirstUserQuery.inputErrors[0],
      })
    } else {
      throw pruviousError(event, {
        message: createFirstUserQuery.runtimeError || __('pruvious-orm', 'An unknown error occurred'),
      })
    }
  }

  const usersCountQuery2 = await selectFrom('Users').count()

  if (!usersCountQuery2.success || usersCountQuery2.data > 1) {
    await deleteFrom('Users').where('id', '=', createFirstUserQuery.data[0]!.id).run()

    throw pruviousError(event, {
      message: __('pruvious-api', 'Pruvious is already installed'),
    })
  }

  const token = await signToken(createFirstUserQuery.data[0]!.tokenSubject, true)

  setTokenCookies(token)

  return { token }
})
