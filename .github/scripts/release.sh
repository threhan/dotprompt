#!/bin/bash

# git clone git@github.com:google/dotprompt.git
# cd js
# pnpm i
# pnpm build
# pnpm test

# pnpm login --registry https://wombat-dressing-room.appspot.com

CURRENT=`pwd`
RELEASE_BRANCH="${RELEASE_BRANCH:-main}"
RELEASE_TAG="${RELEASE_TAG:-next}"

cd js
pnpm publish --tag $RELEASE_TAG --publish-branch $RELEASE_BRANCH --registry https://wombat-dressing-room.appspot.com
