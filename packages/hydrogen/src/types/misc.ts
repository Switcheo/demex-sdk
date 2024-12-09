export interface Pagination {
  total: number
  current_offset: number
  limit: number
}
export interface PaginatedResult<T> {
  data: T[]
  pagination: Pagination
}
