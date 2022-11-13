# This repository has been archived
**For the most up to date version of this template, visit the official repository at https://github.com/bitburner-official/vscode-template**

## Extension Recommendations
[vscode-bitburner-connector](https://github.com/bitburner-official/bitburner-vscode) ([vscode extension marketplace](https://marketplace.visualstudio.com/items?itemName=bitburner.bitburner-vscode-integration)) to upload your files into the game

[vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) to use live linting in editor

[auto-snippet](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.auto-snippet) to automate inserting the file template in `.vscode/snippets.code-snippets`

There is a workspace file in `.vscode` which contains the recommended settings for all of these

## Dependencies
[Node.js](https://nodejs.org/en/download/) required for compiling typescript and installing dependencies

## Installation
```
git clone https://github.com/SlyCedix/bitburner-typescript-template.git
npm install
npm run defs
```

## How to use scripts

(please note, all scripts are .js in the game and compiled from .ts)

`run_coordinator.ts` starts process of bin-packing nodes with worker tasks. It runs in a loop and assigns threads to work on weak, hack or grow.
Only eligable targets are considered:
* for hack only with low security and >95% money
* for grow only with low security
* for weaken everything else

Coordinator uses all hosts including home. However will keep a reserve of 128GB at home. Tunable in coordinate/capacity.ts

To open new hosts use `run_opener.ts`. This script will periodically scan hosts and try to hack them running port openers if they are available

To buy more servers `run_serverbuyer.ts` can be used. It will try to buy and maximize servers and will stop doing that once no more servers can be bought or upgraded

Hackned nodes can be constantly upgraded as well with `run_nodeupgrader.ts`. Do not recommend to run it in early stages as it a waste of money. As soon as you can get coordinator running - it will be much better in terms of money.

## Deugging

For debugging bitburner on Steam you will need to enable a remote debugging port. This can be done by rightclicking bitburner in your Steam library and selecting properties. There you need to add `--remote-debugging-port=9222` [Thanks @DarkMio]
