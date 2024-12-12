#!/usr/bin/env bash

set -eo pipefail

echo "Generating registry…"

TX_FILES=$(find src/data -path -prune -o -name '*.ts')
QUERY_FILES=$(find ./src/data -name 'query.ts')
REGISTRY_FILE=src/index.ts
COSMOS_MODELS_FILE=src/cosmos-models.ts
IBC_MODELS_FILE=src/ibc-models.ts
POLYNETWORK_MODELS_FILE=src/polynetwork-models.ts
ETHERMINT_MODELS_FILE=src/ethermint-models.ts
CARBON_MODELS_FILE=src/carbon-models.ts

ts-node ./scripts/generate-cosmos-models.ts $PWD $COSMOS_MODELS_FILE
ts-node ./scripts/generate-ibc-models.ts $PWD $IBC_MODELS_FILE
ts-node ./scripts/generate-polynetwork-models.ts $PWD $POLYNETWORK_MODELS_FILE
ts-node ./scripts/generate-ethermint-models.ts $PWD $ETHERMINT_MODELS_FILE
ts-node ./scripts/generate-carbon-models.ts $PWD $CARBON_MODELS_FILE
ts-node ./scripts/generate-registry.ts $TX_FILES $PWD $REGISTRY_FILE $POLYNETWORK_MODELS_FILE $CARBON_MODELS_FILE $COSMOS_MODELS_FILE $IBC_MODELS_FILE $ETHERMINT_MODELS_FILE >> $REGISTRY_FILE
ts-node ./scripts/generate-query-clients.ts $QUERY_FILES $REGISTRY_FILE

rm -rf ./scripts/protobuf-def.json
rm -rf proto-ts.tar.gz

