import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import data from './data/storefront.json';
import { componentTextOverrides, readSaved, sections } from './cms-data';
import { stylesFor } from './storefront-styles';

const stylesheets = ['styles.css', 'flatsome.css', 'flatsome-shop.css', 'style.css', 'css2', 'devvn-theme.css', 'devvn-woocommerce.css'].map(name => `/legacy-assets/${name}`).concat(['/legacy-head.css', '/palette.css', '/storefront-overrides.css']);
const attributeNames = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', colspan: 'colSpan', rowspan: 'rowSpan', autocomplete: 'autoComplete', autofocus: 'autoFocus', srcset: 'srcSet', viewbox: 'viewBox', 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'stroke-miterlimit': 'strokeMiterlimit', 'xlink:href': 'xlinkHref' };
const booleanAttributes = new Set(['disabled', 'checked', 'selected', 'multiple', 'required', 'autofocus', 'readonly', 'hidden']);
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function parseStyle(value) {
  const result = {};
  value.split(';').forEach(declaration => {
    const split = declaration.indexOf(':');
    if (split < 0) return;
    const key = declaration.slice(0, split).trim(), val = declaration.slice(split + 1).trim();
    if (!key || !val || val.includes('!important')) return;
    const name = key.startsWith('--') ? key : key.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[name] = val;
  });
  return result;
}

function renderNode(node, key, changes, preview, setMenuOpen, overrides) {
  if (typeof node === 'string') return node;
  if (Object.hasOwn(node, 'text')) return Object.hasOwn(overrides[node.section] || {}, node.index) ? overrides[node.section][node.index] : changes[node.section]?.text && Object.hasOwn(changes[node.section].text, node.index) ? changes[node.section].text[node.index] : node.text;
  const props = { key };
  for (const [name, value] of Object.entries(node.attrs)) {
    if (name.startsWith('on') || name === 'selected') continue;
    if (name === 'style') { props.style = parseStyle(value); continue; }
    const prop = attributeNames[name] || name;
    if (name === 'value' && node.tag === 'input') { props.defaultValue = value; continue; }
    if (name === 'checked') { props.defaultChecked = true; continue; }
    props[prop] = booleanAttributes.has(name) ? true : value;
  }
  if (props.href === 'https://hoatuoi.webmau68.com/') props.href = '/';
  if (node.component) props['data-cms-component'] = node.component;
  if (props['data-open'] === '#main-menu') props.onClick = event => { event.preventDefault(); setMenuOpen(true); };
  if (props.id === 'top-link') props.onClick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  if (preview && node.section) props.onClickCapture = event => {
    event.preventDefault(); event.stopPropagation();
    const component = event.target.closest?.('[data-cms-component]');
    window.parent.postMessage({ type: 'hoa-tuoi-select', id: node.section, componentId: component?.dataset.cmsComponent || null }, window.location.origin);
  };
  if (node.tag === 'style') return React.createElement('style', props, node.children.filter(child => typeof child === 'string').join(''));
  if (voidTags.has(node.tag)) return React.createElement(node.tag, props);
  return React.createElement(node.tag, props, ...node.children.map((child, index) => renderNode(child, index, changes, preview, setMenuOpen, overrides)));
}

export default function Storefront() {
  const [changes, setChanges] = useState(readSaved);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const preview = new URLSearchParams(window.location.search).has('cms-preview');
  const overrides = useMemo(() => Object.fromEntries(sections.map(section => [section.id, componentTextOverrides(section.id, changes[section.id]?.components)])), [changes]);
  useLayoutEffect(() => {
    document.body.className = 'home wp-singular page-template page-template-page-blank page page-id-192 wp-theme-flatsome wp-child-theme-devvn-child theme-flatsome woocommerce-js full-width header-shadow lightbox nav-dropdown-has-arrow nav-dropdown-has-shadow';
    const links = stylesheets.map(href => { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link); return link; });
    return () => { links.forEach(link => link.remove()); document.body.className = ''; };
  }, []);
  useEffect(() => {
    function receive(event) {
      if (event.origin !== window.location.origin || event.source !== window.parent || !preview) return;
      if (event.data?.type === 'hoa-tuoi-draft') setChanges(event.data.changes || {});
      if (event.data?.type === 'hoa-tuoi-focus') setSelectedComponent(event.data.componentId || null);
      if (event.data?.type === 'hoa-tuoi-scroll') {
        const section = sections.find(item => item.id === event.data.id);
        const componentId = event.data.componentId;
        const component = /^[a-z]+-[0-9]+$/.test(componentId || '') ? document.querySelector(`[data-cms-component="${componentId}"]`) : null;
        if (section) (component || document.querySelector(section.selector))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    function saved(event) { if (event.key === 'hoa-tuoi-cms-v1') setChanges(readSaved()); }
    window.addEventListener('message', receive); window.addEventListener('storage', saved);
    if (preview) window.parent.postMessage({ type: 'hoa-tuoi-ready' }, window.location.origin);
    return () => { window.removeEventListener('message', receive); window.removeEventListener('storage', saved); };
  }, [preview]);
  return <>
    <style>{stylesFor(changes) + (preview ? '\n[data-cms-component]:hover { outline: 2px solid #db7c9e !important; outline-offset: 3px; cursor: pointer !important; }' : '') + (preview && /^[a-z]+-[0-9]+$/.test(selectedComponent || '') ? `\n[data-cms-component="${selectedComponent}"] { outline: 2px solid #db7c9e !important; outline-offset: 3px; }` : '')}</style>
    {data.roots.filter(node => node.attrs.id !== 'main-menu').map((node, index) => renderNode(node, index, changes, preview, setMenuOpen, overrides))}
    {menuOpen && <div className="react-menu-overlay" onClick={() => setMenuOpen(false)}><div className="react-mobile-menu" onClick={event => event.stopPropagation()}><button className="react-menu-close" onClick={() => setMenuOpen(false)} aria-label="Đóng menu">×</button>{data.roots.filter(node => node.attrs.id === 'main-menu').map((node, index) => renderNode({ ...node, attrs: { ...node.attrs, class: 'mobile-sidebar' } }, index, changes, preview, setMenuOpen, overrides))}</div></div>}
  </>;
}
