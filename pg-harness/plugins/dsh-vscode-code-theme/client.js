/** Apply the local IDE palette while enabled; dispose restores built-in styling. */
window.__ModuleLoader__.load({ id: 'dsh-vscode-code-theme', factory: () => ({
 name: 'vscode-code-theme-client', inject: [],
 apply(ctx) {
  ctx.effect(() => {
   const style = document.createElement('style');
   style.id = 'dsh-vscode-code-theme';
   style.textContent = "\n:root, body {\n --shiki-foreground: #333333 !important;\n --shiki-background: #ffffff !important;\n --shiki-token-constant: #098658 !important;\n --shiki-token-string: #a31515 !important;\n --shiki-token-comment: #008000 !important;\n --shiki-token-keyword: #0000ff !important;\n --shiki-token-parameter: #001080 !important;\n --shiki-token-function: #795e26 !important;\n --shiki-token-string-expression: #a31515 !important;\n --shiki-token-punctuation: #333333 !important;\n --shiki-token-link: #0000ff !important;\n --dsl-code-block-background: #ffffff !important;\n}\nbody[data-ds-dark-theme] {\n --shiki-foreground: #d4d4d4 !important;\n --shiki-background: #1e1e1e !important;\n --shiki-token-constant: #b5cea8 !important;\n --shiki-token-string: #ce9178 !important;\n --shiki-token-comment: #6a9955 !important;\n --shiki-token-keyword: #c586c0 !important;\n --shiki-token-parameter: #9cdcfe !important;\n --shiki-token-function: #dcdcaa !important;\n --shiki-token-string-expression: #ce9178 !important;\n --shiki-token-punctuation: #d4d4d4 !important;\n --shiki-token-link: #569cd6 !important;\n --dsl-code-block-background: #1e1e1e !important;\n}\nbody pre, body pre code {\n font-family: Menlo, Monaco, 'SFMono-Regular', Consolas, monospace;\n font-size: 13px;\n line-height: 1.6;\n color: var(--shiki-foreground);\n}\nbody pre { background-color: var(--shiki-background) !important; }\n";
   document.head.append(style);
   return () => style.remove();
  }, 'vscode-code-theme: code palette');
 }
}) });
