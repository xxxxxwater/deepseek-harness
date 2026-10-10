#!/bin/zsh
set -e
TASK_DIR="${0:A:h}"
TASK_APP="$TASK_DIR/PureGamma Harness.app"
if [[ ! -d "$TASK_APP" ]]; then
  print 'Place this installer beside PureGamma Harness.app, quit Harness, then try again.'
  exit 1
fi
ELECTRON_RUN_AS_NODE=1 "$TASK_APP/Contents/MacOS/PureGamma Harness" "$TASK_APP/Contents/Resources/pg-harness/install.mjs"
open "$TASK_APP"
