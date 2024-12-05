import { BuildQueryOptions, Definition, QueryTransformer, ResultTransformer } from "./types";

const prepareQueryFn = <QueryArgs extends any[], ReturnValue>(
  baseUrl: string,
  transformQueryOrPath: QueryTransformer<QueryArgs> | string,
  transformResponse: ResultTransformer<ReturnValue>,
) =>
  async (...args: QueryArgs): Promise<ReturnValue> => {
    const opts = typeof transformQueryOrPath === "string"

      //  transformQueryOrPath is a string, so its the path
      ? { path: transformQueryOrPath }

      // transformQueryOrPath is a function, apply the transformation
      : transformQueryOrPath(...args);
    const {
      path = "",
      init,
      method = init?.method ?? "get",
    } = opts;

    const requestInit = {
      ...init,
      method,
    };

    const response = await fetch(baseUrl.concat(path), requestInit);
    const result = await response.json();
    return transformResponse(result);
  }

export const baseTransformQuery = <QueryArgs extends any[]>(...args: QueryArgs) => {
  return {};
}
export const baseTransformResponse = <ReturnValue>(response: ReturnValue): ReturnValue => {
  return response;
}

const defBuilder = (baseUrl: string) => ({
  get: <ReturnValue, QueryArgs extends any[]>(opts: BuildQueryOptions<QueryArgs, ReturnValue> = {}): Definition<QueryArgs, ReturnValue> => {
    const {
      query: transformQuery = baseTransformQuery,
      transformResponse = baseTransformResponse<ReturnValue>,
    } = opts;
    return {
      queryFn: prepareQueryFn(baseUrl, transformQuery, transformResponse),
      transformQuery: typeof transformQuery === "string" ? undefined : transformQuery,
      transformResponse,
    };
  }
});
type DefinitionBuilderFactory = ReturnType<typeof defBuilder>;

export const createFetchClient = <Options extends Record<string, Definition<any, any>>>(baseUrl: string, builderFn: ((builder: DefinitionBuilderFactory) => Options)) => {
  const options = builderFn(defBuilder(baseUrl));
  const client = {} as {
    [Key in keyof Options]: Options[Key]['queryFn'];
  };

  for (const key in options) {
    client[key] = options[key].queryFn;
  }

  return client;
};
