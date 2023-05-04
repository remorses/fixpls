<div align='center'>
    <br/>
    <br/>
    <img src='' width='320px'>
    <br/>
    <h3>fixpls</h3>
    <p>Fix your compiler errors automatically with GPT</p>
    <br/>
    <br/>
</div>

## Installation

```sh
# install fixpls
npm i -g fixpls
fixpls login
```

## Usage

```
fixpls -- tsc
```

Fixpls will try to run the command and if it fails it will parse the compiler errors and try to fix them with `code-davinci-edit-001`.

It will then try to run again the compiler until it exits with a 0 exit code.

> Warning: The AI could become conscient and take over the world, keep an eye on your screen just to make sure

## Supported tools

-   `tsc`

To add a compiler you will need to add a file like [`tsc.ts`](./fixpls/src/fixers/tsc.ts) that is able to parse your compiler errors and create a prompt

It should be easy to add new compiler like `rustc`, `pylint` and many others (even using stack traces as errors to fix runtime crashes)
