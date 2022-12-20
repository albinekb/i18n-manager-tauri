# i18n manager rewritten in React+Tauri

## How to run

- `yarn install`
- `yarn dev`

# Install

- Get the [release](https://github.com/albinekb/i18n-manager-tauri/releases/latest)

## "App is damaged and can't be opened" error

If you are getting "app is damaged and can't be opened" error
run `xattr -cr i18n-manager-tarui.app` in the terminal, this is due to the app being quarantined by macOS.

# Develop

This project is using [emoji-commit](https://github.com/LinusU/emoji-commit) to generate changelogs.
When you commit, you have to use the emoji-commit format. Read more here [emoji-commit - the-emojis](https://github.com/LinusU/emoji-commit#the-emojis)

1. `cargo install emoji-commit`
2. `git add .`
3. `emoji-commit`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
