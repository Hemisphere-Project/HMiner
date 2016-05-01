#!/bin/bash

cd "$(dirname "$0")"

export GPU_FORCE_64BIT_PTR=0
export GPU_MAX_ALLOC_PERCENT=95
export GPU_USE_SYNC_OBJECTS=1
export GPU_MAX_HEAP_SIZE=100

amdconfig --od-enable --adapter=all
amdconfig --pplib-cmd "set fanspeed 0 65" --adapter=all

# Start Miner
node autominer/main.js
