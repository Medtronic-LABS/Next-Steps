import React, { createElement as h, Fragment } from 'react';

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

export function resolve(vals: any, src: any): any {
  const expr = String(src).trim();
  if (!expr) return undefined;
  if (expr[0] === '(' && expr[expr.length - 1] === ')' && parensWrapWhole(expr)) {
    return resolve(vals, expr.slice(1, -1));
  }
  const eq = findTopLevelEquality(expr);
  if (eq) {
    const lv = resolve(vals, expr.slice(0, eq.index));
    const rv = resolve(vals, expr.slice(eq.index + eq.op.length));
    switch (eq.op) {
      case '===':
        return lv === rv;
      case '!==':
        return lv !== rv;
      case '==':
        return lv == rv;
      default:
        return lv != rv;
    }
  }
  if (expr[0] === '!') return !resolve(vals, expr.slice(1));
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (expr === 'null') return null;
  if (expr === 'undefined') return undefined;
  if (NUMBER_RE.test(expr)) return Number(expr);
  if (expr.length >= 2 && (expr[0] === '"' || expr[0] === "'") && expr[expr.length - 1] === expr[0]) {
    return expr.slice(1, -1);
  }
  return resolvePath(vals, expr);
}

function parensWrapWhole(expr: string): boolean {
  let depth = 0;
  for (let i = 0; i < expr.length - 1; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') {
      depth--;
      if (depth === 0) return false;
    }
  }
  return true;
}

function findTopLevelEquality(expr: string): { index: number; op: string } | null {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (depth === 0 && (c === '=' || c === '!') && expr[i + 1] === '=') {
      if (i > 0 && (expr[i - 1] === '=' || expr[i - 1] === '!')) continue;
      if (!expr.slice(0, i).trim()) continue;
      const op = expr[i + 2] === '=' ? c + '==' : c + '=';
      return { index: i, op };
    }
  }
  return null;
}

function resolvePath(vals: any, expr: string): any {
  const head = expr.match(IDENT_RE);
  if (!head) return undefined;
  let cur = vals == null ? undefined : vals[head[0]];
  let i = head[0].length;
  while (i < expr.length) {
    if (expr[i] === '.') {
      const m = expr.slice(i + 1).match(IDENT_RE) || expr.slice(i + 1).match(/^\d+/);
      if (!m) return undefined;
      cur = cur == null ? undefined : cur[m[0]];
      i += 1 + m[0].length;
    } else if (expr[i] === '[') {
      let depth = 1;
      let j = i + 1;
      while (j < expr.length && depth > 0) {
        if (expr[j] === '[') depth++;
        else if (expr[j] === ']') {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      if (depth !== 0) return undefined;
      const key = resolve(vals, expr.slice(i + 1, j));
      cur = cur == null ? undefined : cur[key];
      i = j + 1;
    } else {
      return undefined;
    }
  }
  return cur;
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function cssToObj(css: string): Record<string, any> {
  const o: Record<string, any> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    if (!prop) continue;
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }
  return o;
}

function compileAttr(raw: string): (vals: any) => any {
  const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
  if (whole) {
    const path = whole[1];
    return (vals) => resolve(vals, path);
  }
  if (raw.includes('{{')) {
    const parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
    return (vals) => parts.map((s, i) => (i & 1 ? resolve(vals, s) ?? '' : s)).join('');
  }
  return () => raw;
}

const EVENT_MAP: Record<string, string> = {
  onclick: 'onClick',
  onchange: 'onChange',
  oninput: 'onInput',
  onsubmit: 'onSubmit',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onkeypress: 'onKeyPress',
  onmousedown: 'onMouseDown',
  onmouseup: 'onMouseUp',
  onmouseenter: 'onMouseEnter',
  onmouseleave: 'onMouseLeave',
  onfocus: 'onFocus',
  onblur: 'onBlur',
  ondoubleclick: 'onDoubleClick',
  oncontextmenu: 'onContextMenu',
  ontouchstart: 'onTouchStart',
  ontouchend: 'onTouchEnd',
  ontouchmove: 'onTouchMove',
};

const SVG_ATTR_MAP: Record<string, string> = {
  viewbox: 'viewBox',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'mix-blend-mode': 'mixBlendMode',
};

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function scanUnquotedUrl(css: string, start: number): number {
  if (css.slice(start, start + 4).toLowerCase() !== 'url(') return -1;
  const close = css.indexOf(')', start + 4);
  return close === -1 ? -1 : close + 1;
}

function importantify(css: string): string {
  css = stripComments(css);
  const decls: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === "'" || c === '"') quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) {
      decls.push(css.slice(start, i));
      start = i + 1;
    } else {
      const end = scanUnquotedUrl(css, i);
      if (end !== -1) i = end - 1;
    }
  }
  decls.push(css.slice(start));
  return decls
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => (/!\s*important$/i.test(d) ? d : d + ' !important'))
    .join(';');
}

function createPseudoSheet() {
  let el: HTMLStyleElement | null = null;
  const cache = new Map<string, string>();
  let n = 0;
  return (pseudo: string, css: string) => {
    if (typeof document === 'undefined') return '';
    const k = pseudo + '|' + css;
    const hit = cache.get(k);
    if (hit) return hit;
    if (!el) {
      el = document.createElement('style');
      document.head.appendChild(el);
    }
    const cls = 'scp' + (n++).toString(36);
    const isPseudoElement = pseudo === 'before' || pseudo === 'after';
    const sel = isPseudoElement ? '.' + cls + '::' + pseudo : '.' + cls + ':' + pseudo;
    try {
      el.sheet?.insertRule(
        sel + '{' + (isPseudoElement ? css : importantify(css)) + '}',
        el.sheet.cssRules.length
      );
    } catch {
      // Ignore sheet errors if any
    }
    cache.set(k, cls);
    return cls;
  };
}

const pseudoClass = createPseudoSheet();

type RenderFn = (vals: any, ctx: any, key: any) => React.ReactNode;

function walkText(node: Node): RenderFn | null {
  const txt = node.nodeValue ?? '';
  if (!txt.includes('{{')) {
    if (!txt.trim() && !txt.includes(' ')) return null;
    return () => txt;
  }
  const parts = txt.split(/\{\{([\s\S]+?)\}\}/g);
  return (vals, _ctx, key) =>
    h(
      Fragment,
      { key },
      ...parts.map((p, i) => {
        if (!(i & 1)) return p;
        const v = resolve(vals, p);
        if (v === undefined || v === null || typeof v === 'boolean') return null;
        if (React.isValidElement(v) || Array.isArray(v)) {
          return h(Fragment, { key: i }, v as any);
        }
        return String(v);
      })
    );
}

function walkFor(el: Element): RenderFn {
  const listGet = compileAttr(el.getAttribute('list') || '');
  const asName = el.getAttribute('as') || 'item';
  const kids = walkChildren(el);
  return (vals, ctx, key) => {
    let list = listGet(vals);
    if (!Array.isArray(list)) list = [];
    return h(
      Fragment,
      { key },
      list.map((item, i) => {
        const sub = { ...vals, [asName]: item, $index: i };
        return h(
          Fragment,
          { key: item && typeof item === 'object' && item.id ? item.id : i },
          kids.map((b, j) => b(sub, ctx, j))
        );
      })
    );
  };
}

function walkIf(el: Element): RenderFn {
  const valGet = compileAttr(el.getAttribute('value') || '');
  const kids = walkChildren(el);
  return (vals, ctx, key) => {
    const v = valGet(vals);
    return v ? h(Fragment, { key }, kids.map((b, j) => b(vals, ctx, j))) : null;
  };
}

function walkElement(el: Element): RenderFn {
  const realTag = el.localName;
  const propGetters: [string, (vals: any) => any][] = [];
  const pseudoClasses: string[] = [];

  for (const { name, value } of Array.from(el.attributes)) {
    if (name === 'sc-name' || name === 'data-dc-tpl') continue;
    let key = name;
    if (key.startsWith('style-')) {
      pseudoClasses.push(pseudoClass(key.slice(6), value));
      continue;
    }
    if (key === 'class') key = 'className';
    else if (key === 'for') key = 'htmlFor';
    else if (key.startsWith('on')) {
      key = EVENT_MAP[key] || 'on' + key[2].toUpperCase() + key.slice(3);
    } else if (SVG_ATTR_MAP[key]) {
      key = SVG_ATTR_MAP[key];
    }
    propGetters.push([key, compileAttr(value)]);
  }

  const kids = walkChildren(el);

  return (vals, ctx, key) => {
    const props: Record<string, any> = { key };
    for (const [k, g] of propGetters) {
      let v = g(vals);
      if (k === 'style' && typeof v === 'string') {
        v = cssToObj(v);
      }
      if ((k === 'value' || k === 'checked') && v === undefined) {
        v = k === 'checked' ? false : '';
      }
      props[k] = v;
    }
    if (pseudoClasses.length) {
      props.className = [props.className, ...pseudoClasses].filter(Boolean).join(' ');
    }
    return h(realTag, props, ...kids.map((b, j) => b(vals, ctx, j)));
  };
}

function walk(node: Node): RenderFn | null {
  if (node.nodeType === Node.TEXT_NODE) return walkText(node);
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === 'sc-for') return walkFor(el);
  if (tag === 'sc-if') return walkIf(el);
  return walkElement(el);
}

function walkChildren(node: Node): RenderFn[] {
  return Array.from(node.childNodes)
    .map((c) => walk(c))
    .filter((b): b is RenderFn => b !== null);
}

export function compileTemplate(html: string): (vals: any, ctx?: any) => React.ReactNode {
  if (typeof document === 'undefined') {
    return () => null;
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const builders = walkChildren(tpl.content);
  return (vals, ctx) => builders.map((b, i) => b(vals || {}, ctx, i));
}
