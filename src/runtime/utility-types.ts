import type { CollectionName, MultiCollectionName, SingleCollectionName, UploadsCollectionName } from '#pruvious'
import type { MultiQueryBuilderMethod, QueryBuilder } from './collections/query-builder'
import type { SingleQueryBuilder } from './collections/single-query-builder'
import type { UploadsQueryBuilder } from './collections/uploads-query-builder'

export type Booleanish = boolean | 1 | 0 | 'true' | 'false' | 't' | 'f' | 'yes' | 'no' | 'y' | 'n'

export type QueryBuilderInstance<T extends CollectionName> = T extends MultiCollectionName
  ? T extends UploadsCollectionName
    ? UploadsQueryBuilder
    : Pick<QueryBuilder<T>, MultiQueryBuilderMethod<T>>
  : InstanceType<typeof SingleQueryBuilder<T & SingleCollectionName>>
