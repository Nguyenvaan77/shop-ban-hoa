import data from './data/storefront.json';

export const STORAGE_KEY = 'hoa-tuoi-cms-v1';
export const sections = [
  { id: 'header', name: 'Đầu trang & menu', selector: '#header', icon: '▤' },
  { id: 'hero', name: 'Ảnh đầu trang', selector: '#section_1228191384', icon: '▧' },
  { id: 'benefits', name: 'Cam kết dịch vụ', selector: '#section_137183005', icon: '✧' },
  { id: 'categories', name: 'Danh mục hoa', selector: '#section_3512536', icon: '▦' },
  { id: 'bouquets', name: 'Hoa bó', selector: '#section_1550835764', icon: '♧' },
  { id: 'baskets', name: 'Giỏ hoa', selector: '#section_294454677', icon: '♧' },
  { id: 'contact', name: 'Tư vấn đặt hoa', selector: '#section_1960654716', icon: '☏' },
  { id: 'opening', name: 'Hoa khai trương', selector: '#section_1266025136', icon: '♧' },
  { id: 'sympathy', name: 'Hoa viếng', selector: '#section_1073489451', icon: '♧' },
  { id: 'steps', name: 'Các bước đặt hoa', selector: '#section_509498838', icon: '☷' },
  { id: 'footer', name: 'Chân trang', selector: '#footer', icon: '▤' }
];
export const fonts = { vietnam: 'Be Vietnam Pro', sans: 'Arial', serif: 'Georgia', times: 'Times New Roman', system: 'System UI' };
export const texts = data.texts;

// IDs are generated from the source tree in a stable order, shared by the
// storefront and editor. Each component references its own text nodes.
export const components = Object.fromEntries(sections.map(section => [section.id, []]));
const textContainers = new Set(['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']);
const namedContainers = /\b(ht-hero-script|ht-hero-sub|ht-eyebrow|ht-cta-title|ht-cta-sub)\b/;
function collectText(node, sectionId) {
  if (typeof node === 'string') return [];
  if (Object.hasOwn(node, 'text')) return node.section === sectionId ? [node.index] : [];
  return (node.children || []).flatMap(child => collectText(child, sectionId));
}
function register(node, inheritedSection) {
  if (typeof node === 'string' || Object.hasOwn(node, 'text')) return;
  const sectionId = node.section || inheritedSection;
  if (sectionId && (textContainers.has(node.tag) || namedContainers.test(node.attrs.class || ''))) {
    const indexes = collectText(node, sectionId);
    if (indexes.length) {
      const original = indexes.map(index => texts[sectionId][index]).join(' ').replace(/\s+/g, ' ').trim();
      const id = `${sectionId}-${components[sectionId].length}`;
      const type = node.tag === 'button' || (node.tag === 'a' && /\b(button|btn|ht-head-call|ht-head-zalo)/.test(node.attrs.class || '')) ? 'Nút' : node.tag === 'a' ? 'Liên kết' : /^h[1-6]$/.test(node.tag) ? 'Tiêu đề' : 'Đoạn chữ';
      node.component = id;
      components[sectionId].push({ id, type, original, indexes });
    }
  }
  (node.children || []).forEach(child => register(child, sectionId));
}
data.roots.forEach(node => register(node, null));

export function componentTextOverrides(sectionId, componentChanges) {
  const overrides = {};
  for (const component of components[sectionId] || []) {
    const change = componentChanges?.[component.id];
    if (change && Object.hasOwn(change, 'text')) {
      component.indexes.forEach((index, position) => { overrides[index] = position === 0 ? change.text : ''; });
    }
  }
  return overrides;
}
export function readSaved() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}
export function countChanges(changes) {
  return Object.values(changes).reduce((count, item) => count + Object.keys(item.text || {}).length + ['textColor', 'background', 'font'].filter(key => item[key]).length + Object.values(item.components || {}).reduce((sum, component) => sum + ['text', 'textColor', 'background', 'font'].filter(key => Object.hasOwn(component, key)).length, 0), 0);
}
export function cleanChanges(changes) {
  const clean = {};
  for (const [id, value] of Object.entries(changes)) {
    const item = { ...value };
    if (item.text && !Object.keys(item.text).length) delete item.text;
    if (item.components) {
      item.components = Object.fromEntries(Object.entries(item.components).filter(([, component]) => Object.keys(component).length));
      if (!Object.keys(item.components).length) delete item.components;
    }
    if (Object.keys(item).length) clean[id] = item;
  }
  return clean;
}
