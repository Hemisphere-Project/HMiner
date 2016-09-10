#!/bin/bash

cd "$(dirname "$0")"

export GPU_FORCE_64BIT_PTR=0
export GPU_MAX_ALLOC_PERCENT=95
export GPU_USE_SYNC_OBJECTS=1
export GPU_MAX_HEAP_SIZE=95

pkill stdin-exec

amdconfig --od-enable --adapter=all
export DISPLAY=:0.0
amdconfig --pplib-cmd "set fanspeed 0 100"
export DISPLAY=:0.1
amdconfig --pplib-cmd "set fanspeed 0 100"

# Start Miner
node autominer/main.js

