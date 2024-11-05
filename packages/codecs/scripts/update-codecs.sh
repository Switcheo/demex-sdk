#!/usr/bin/env bash

set -eo pipefail

rm -rf ./src/*
tar -zxvf proto-ts.tar.gz --directory ./src
mv src/protobuf-def.json ./scripts/


# Remove unnecessary codec files
rm -rf \
  src/collateralizeddebtposition/ \
  src/autodeleverage/ \
  src/cosmos_proto/ \
  src/gogoproto/ \
  src/google/api/ 

yarn codecs:reset
sh $(dirname "${BASH_SOURCE[0]}")/generate-registry.sh
