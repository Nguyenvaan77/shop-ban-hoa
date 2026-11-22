import { sections } from './cms-data';

const fontFamilies = { vietnam: '"Be Vietnam Pro", sans-serif', sans: 'Arial, sans-serif', serif: 'Georgia, serif', times: '"Times New Roman", serif', system: 'system-ui, sans-serif' };
const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '';
export function stylesFor(changes) {
  const rules = [];
  sections.forEach(({ id, selector }) => {
    const item = changes[id] || {}, text = color(item.textColor), background = color(item.background), font = fontFamilies[item.font];
    if (text) rules.push(`${selector}, ${selector} :not(i):not(svg):not(path) { color: ${text} !important; }`);
    if (font) rules.push(`${selector}, ${selector} *:not(i):not([class*="icon-"]) { font-family: ${font} !important; }`);
    if (background) {
      if (id === 'hero') rules.push(`${selector} .section-bg::after { content: ""; position: absolute; inset: 0; background-color: ${background}; opacity: .45; pointer-events: none; }`);
      else if (id === 'contact') rules.push(`${selector} .section-bg { background-color: ${background} !important; }`);
      else if (id === 'header') rules.push(`${selector} .header-bg-color, ${selector} .header-top, ${selector} .header-bottom { background-color: ${background} !important; }`);
      else if (id === 'footer') rules.push(`${selector} .footer-1, ${selector} .absolute-footer { background-color: ${background} !important; }`);
      else rules.push(`${selector}, ${selector} > .section-bg { background-color: ${background} !important; }`);
    }
    Object.entries(item.components || {}).forEach(([componentId, component]) => {
      // Only generated identifiers may become CSS selectors.
      if (!new RegExp(`^${id}-[0-9]+$`).test(componentId)) return;
      const target = `${selector} [data-cms-component="${componentId}"]`;
      const componentColor = color(component.textColor), componentBackground = color(component.background), componentFont = fontFamilies[component.font];
      if (componentColor) rules.push(`${target}, ${target} :not(i):not(svg):not(path) { color: ${componentColor} !important; }`);
      if (componentBackground) rules.push(`${target} { background-color: ${componentBackground} !important; }`);
      if (componentFont) rules.push(`${target}, ${target} *:not(i):not([class*="icon-"]) { font-family: ${componentFont} !important; }`);
    });
  });
  return rules.join('\n');
}
