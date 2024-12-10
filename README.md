# GPT Text Reformulator - Chrome Extension

![Présentation du GPT Text Reformulator](docs/presentation.gif)

![GitHub License](https://img.shields.io/github/license/Jokod/GPT-Text-Reformulator) ![GitHub Release](https://img.shields.io/github/v/release/Jokod/GPT-Text-Reformulator) [![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2FJokod%2FGPT-Text-Reformulator&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)


A Chrome extension that helps reformulate text using ChatGPT API. It provides different writing styles and keeps track of text history.

## Features

- Text reformulation with GPT-3.5
- Three writing styles: Professional, Casual, and Formal
- Text history with undo/redo functionality
- Keyboard shortcuts
- Dark mode support
- Smooth typing animation

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Configuration

1. Click the extension icon in Chrome toolbar
2. Enter your OpenAI API key
3. Click "Save"

To get an API key:
- Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
- Create a new key
- Copy and paste it into the extension settings

## Usage

### Basic Usage
1. Click on any text input or textarea on a webpage
2. The reformulation toolbar will appear below
3. Click the refresh icon or press Alt+R to reformulate the text

### Writing Styles
Click the settings icon to choose between:
- Professional (default)
- Casual
- Formal

### Keyboard Shortcuts
- `Alt + R`: Reformulate text
- `Alt + Z`: Undo
- `Alt + Y`: Redo
- `Alt + O`: Reset to original text

### History Navigation
Use the toolbar buttons to:
- ↶ Undo changes
- ↷ Redo changes
- ⟲ Reset to original text
