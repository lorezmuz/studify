import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

/** Escape per inserire markdown in un template HTML. */
function escapeForScript(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")
    .replace(/<\/script/gi, "<\\/script");
}

/**
 * Rendering markdown + KaTeX via WebView (CDN, funziona offline solo se già in cache browser —
 * in pratica richiede rete la prima volta; il testo resta leggibile anche se CDN fallisce).
 */
export function MarkdownView({
  markdown,
  title,
}: {
  markdown: string;
  title?: string;
}) {
  const html = useMemo(() => {
    const md = escapeForScript(markdown || "");
    const t = escapeForScript(title || "");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-light.min.css" />
  <style>
    html, body { margin: 0; padding: 0; background: #f6f8f5; }
    .wrap { padding: 8px 16px 48px; }
    .markdown-body {
      background: transparent;
      font-size: 16px;
      line-height: 1.7;
      color: #18181b;
    }
    .markdown-body code {
      background: #eef2ec;
      border-radius: 6px;
      padding: 0.1em 0.35em;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 {
      border-bottom: none;
      margin-top: 1.2em;
    }
    .fallback {
      white-space: pre-wrap;
      font-family: system-ui, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #18181b;
      padding: 12px 16px;
    }
  </style>
</head>
<body>
  <div id="app" class="wrap">
    <div id="out" class="markdown-body"></div>
    <pre id="fallback" class="fallback" style="display:none"></pre>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <script>
    const raw = \`${md}\`;
    const title = \`${t}\`;
    try {
      if (window.marked) {
        marked.setOptions({ gfm: true, breaks: true });
        let html = marked.parse(raw);
        document.getElementById('out').innerHTML = html;
        if (window.renderMathInElement) {
          renderMathInElement(document.getElementById('out'), {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\\\(', right: '\\\\)', display: false },
              { left: '\\\\[', right: '\\\\]', display: true }
            ],
            throwOnError: false
          });
        }
      } else {
        throw new Error('marked missing');
      }
    } catch (e) {
      document.getElementById('out').style.display = 'none';
      const fb = document.getElementById('fallback');
      fb.style.display = 'block';
      fb.textContent = (title ? title + '\\n\\n' : '') + raw;
    }
  </script>
</body>
</html>`;
  }, [markdown, title]);

  return (
    <View style={styles.box}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 200 },
  web: { flex: 1, backgroundColor: "transparent" },
});
