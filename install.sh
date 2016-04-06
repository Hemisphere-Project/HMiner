#!/bin/bash

cd "$(dirname "$0")"

## GENERIC
# sudo apt-get install git nodejs

# # ATI SDKs
# # download and start AMD SDK 2.9.1 : http://developer.amd.com/tools-and-sdks/opencl-zone/amd-accelerated-parallel-processing-app-sdk/
# # download and start AMD ADL SDK 8: http://developer.amd.com/tools-and-sdks/graphics-development/display-library-adl-sdk/
# ./AMD-APP-SDK-v2.9-1.599.381-GA-linux64.sh
# ln -s /opt/AMDAPPSDK-2.9-1 /opt/AMDAPP
# ln -s /opt/AMDAPP/include/CL /usr/include
# ln -s /opt/AMDAPP/lib/x86_64/* /usr/lib/
# ldconfig
# reboot
#
# # ATICONFIG
# sudo apt-get install fglrx-updates
# sudo aticonfig --adapter=all --initial
# sudo aticonfig --list-adapters
#
# # GETH / ETHEREUM
# sudo apt-get install software-properties-common
# sudo add-apt-repository -y ppa:ethereum/ethereum
# sudo add-apt-repository -y ppa:ethereum/ethereum-dev
# sudo apt-get update
# sudo apt-get install ethereum


# GET eth-proxy
if [ ! -d "./eth-proxy" ]; then
    git clone https://github.com/Atrides/eth-proxy.git
    cp ethermine.conf eth-proxy/eth-proxy.conf
fi

# NODE Modules
npm install
