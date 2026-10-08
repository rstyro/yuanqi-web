/**
 * 极简 Markdown 渲染器 —— 只为「命理报告正文」服务。
 *
 * <h3>为什么自己写而不装 marked / markdown-it</h3>
 * 覆盖率是<b>刻意收窄</b>的：报告正文由我们自己的提示词约束，实际只会出现标题、列表、
 * 引用、表格、粗体这几类语法，为它引入一个完整 CommonMark 实现并不划算 ——
 * 多一个依赖、多一份体积，还多一处「渲染器行为不可控」的联调成本。
 *
 * <p>代价是覆盖有限：<b>嵌套列表、脚注、内嵌 HTML、任务列表都没有实现，
 * 遇到时会被降级成普通段落而不是报错</b>。
 * 一旦报告里真的开始出现这些结构，就该换成 marked —— 那时只是一条命令的事：
 * <pre>pnpm add marked</pre>
 * 别再往这个文件里堆规则，手写 Markdown 解析器的复杂度是会失控的。
 *
 * <h3>安全</h3>
 * 一律先转义 HTML 再做行内替换，因此结果可以直接 v-html 而不会把模型输出当代码执行。
 *
 * <p>支持：# ~ ###### 标题、--- 分隔线、- / * / + 无序列表、1. 有序列表、
 * &gt; 引用、``` 围栏代码块、| 表格 |、**粗** *斜* `代码` ~~删除~~ [链接](url)。
 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/** 行内语法。 */
function renderInline(text: string): string {
  let out = escapeHtml(text);

  // 行内代码先摘出来占位，否则里面的 * _ ~ 会被后面几条规则误伤
  const codes: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 只认 *斜*，不认 _斜_ —— 命理文本里下划线常出现在字段名（如 day_pillar）上
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  out = out.replace(
    /\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<code>${codes[Number(i)]}</code>`);
}

const RE_HEADING = /^\s{0,3}(#{1,6})\s+(.*)$/;
const RE_HR = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const RE_UL = /^(\s*)[-*+]\s+(.*)$/;
const RE_OL = /^(\s*)\d+[.)]\s+(.*)$/;
const RE_QUOTE = /^\s{0,3}>\s?(.*)$/;
const RE_FENCE = /^\s{0,3}```(.*)$/;
const RE_TABLE_SEP = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * 合并软换行。
 *
 * <p>Markdown 里一段内的换行等价于空格，但中文不需要那个空格 ——
 * 「生于卯月，\n木旺金衰」硬拼一个空格出来，读起来就是断的。
 * 所以只有换行处两侧都是 ASCII 时才补空格。
 */
function joinSoftLines(lines: string[]): string {
  let merged = '';
  for (const line of lines) {
    if (!merged) {
      merged = line;
      continue;
    }
    const prevCode = merged.charCodeAt(merged.length - 1);
    const nextCode = line.charCodeAt(0);
    merged += prevCode > 0x2e80 && nextCode > 0x2e80 ? '' : ' ';
    merged += line;
  }
  return merged;
}

/** 渲染成一段 HTML。输入为空或非字符串时返回空串。 */
export function renderMarkdown(source: string): string {
  if (!source || typeof source !== 'string') return '';

  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let inQuote = false;
  let paragraph: string[] = [];

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push('</blockquote>');
      inQuote = false;
    }
  };
  const closeParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(joinSoftLines(paragraph))}</p>`);
      paragraph = [];
    }
  };
  // 块级结构切换时，先收掉所有「行内级」的未闭合容器
  const closeBlocks = () => {
    closeParagraph();
    closeList();
    closeQuote();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ---- 围栏代码块 ----
    const fence = RE_FENCE.exec(line);
    if (fence) {
      closeBlocks();
      const lang = fence[1].trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !RE_FENCE.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      // 循环结束时 i 停在闭合围栏上（或越界），外层循环的 i++ 会跳过它
      out.push(
        `<pre class="md-code"><code${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}>${escapeHtml(
          body.join('\n'),
        )}</code></pre>`,
      );
      continue;
    }

    // ---- 空行：结束当前块 ----
    if (!line.trim()) {
      closeBlocks();
      continue;
    }

    // ---- 分隔线 ----
    if (RE_HR.test(line)) {
      closeBlocks();
      out.push('<hr/>');
      continue;
    }

    // ---- 标题 ----
    const heading = RE_HEADING.exec(line);
    if (heading) {
      closeBlocks();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      continue;
    }

    // ---- 表格（当前行是表头，下一行是分隔行才算）----
    if (isTableRow(line) && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) {
      closeBlocks();
      const header = splitRow(line);
      i += 2; // 跳过表头和分隔行
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--; // 外层循环会 i++，退一格免得漏掉表格后的第一行
      const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
      const body = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    // ---- 引用 ----
    const quote = RE_QUOTE.exec(line);
    if (quote) {
      closeParagraph();
      closeList();
      if (!inQuote) {
        out.push('<blockquote>');
        inQuote = true;
      }
      out.push(`<p>${renderInline(quote[1])}</p>`);
      continue;
    }

    // ---- 有序列表 ----
    const ordered = RE_OL.exec(line);
    if (ordered) {
      closeParagraph();
      closeQuote();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${renderInline(ordered[2])}</li>`);
      continue;
    }

    // ---- 无序列表 ----
    const unordered = RE_UL.exec(line);
    if (unordered) {
      closeParagraph();
      closeQuote();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${renderInline(unordered[2])}</li>`);
      continue;
    }

    // ---- 普通段落（连续行合并成一段）----
    closeList();
    closeQuote();
    paragraph.push(line.trim());
  }

  closeBlocks();
  return out.join('\n');
}
