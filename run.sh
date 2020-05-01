#!/bin/bash

DIR="$(dirname "${BASH_SOURCE[0]}")"
exec deno --allow-read --allow-write --allow-env "$DIR/main.ts" "$@"
