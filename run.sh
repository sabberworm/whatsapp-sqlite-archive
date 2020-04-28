#!/bin/bash

DIR="$(dirname "${BASH_SOURCE[0]}")"
exec deno --allow-read --allow-write "$DIR/main.ts" "$@"
