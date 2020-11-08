#!/bin/bash

DIR="$(dirname "${BASH_SOURCE[0]}")"
exec deno run --allow-read --allow-write --allow-env --unstable "$DIR/main.ts" "$@"
