export interface QueryFn<QueryArgs extends any[], ReturnValue> {
  (...args: QueryArgs): Promise<ReturnValue>
}
export interface QueryTransformer<QueryArgs extends any[]> {
  (...args: QueryArgs): QueryOptions
}
export interface ResultTransformer<ReturnValue, OriginalValue extends any = any> {
  (result: OriginalValue): ReturnValue
}
export interface QueryOptions {
  path?: string
  method?: RequestInit["method"]
  init?: RequestInit
}
export interface TransformQueryResult extends QueryOptions { }
export interface BuildQueryOptions<QueryArgs extends any[], ReturnValue> {
  query?: string | QueryTransformer<QueryArgs>
  transformResponse?: ResultTransformer<ReturnValue>
}
export interface Definition<QueryArgs extends any[], ReturnValue> {
  queryFn: QueryFn<QueryArgs, ReturnValue>
  transformQuery?: QueryTransformer<QueryArgs>
  transformResponse?: ResultTransformer<ReturnValue>
}
