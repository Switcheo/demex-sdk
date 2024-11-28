#!/usr/bin/env bash

set -eo pipefail

rm -rf ./src/*
tar -zxvf proto-ts.tar.gz --directory ./src/data
mv src/protobuf-def.json ./scripts/


# Remove unnecessary codec files
rm -rf \
  src/data/collateralizeddebtposition/ \
  src/data/autodeleverage/ \
  src/data/cosmos_proto/ \
  src/data/gogoproto/ \
  src/data/google/api/ 

yarn codecs:reset
sh $(dirname "${BASH_SOURCE[0]}")/generate-registry.sh
