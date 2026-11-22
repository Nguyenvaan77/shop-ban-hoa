"""Convert the saved storefront into React-renderable data and styles."""
from pathlib import Path
import json
import re
from lxml import html, etree

source = Path('legacy/index.html')
doc = html.fromstring(source.read_bytes())
sections = {
    'header': 'header', 'section_1228191384': 'hero',
    'section_137183005': 'benefits', 'section_3512536': 'categories',
    'section_1550835764': 'bouquets', 'section_294454677': 'baskets',
    'section_1960654716': 'contact', 'section_1266025136': 'opening',
    'section_1073489451': 'sympathy', 'section_509498838': 'steps',
    'footer': 'footer',
}
counts = {value: 0 for value in sections.values()}
texts = {value: [] for value in sections.values()}
asset_pattern = re.compile(r'\./[^"\']+?_files/')

def convert(node, section=None, excluded=False):
    if not isinstance(node.tag, str) or node.tag.lower() in ('script', 'noscript'):
        return None
    tag = node.tag.lower()
    section = sections.get(node.get('id'), section)
    excluded = excluded or tag in ('style', 'svg') or 'screen-reader-text' in (node.get('class') or '').split()
    attrs = dict(node.attrib)
    for key in ('src', 'href'):
        if key in attrs:
            attrs[key] = asset_pattern.sub('/legacy-assets/', attrs[key])
    # Use the downloaded images rather than the original site's responsive URLs.
    attrs.pop('srcset', None)
    attrs.pop('data-srcset', None)
    result = {'tag': tag, 'attrs': attrs, 'children': []}
    if node.get('id') in sections:
        result['section'] = section

    def text_item(value):
        if not value:
            return
        if section and not excluded and value.strip():
            index = counts[section]
            counts[section] += 1
            texts[section].append(value.strip())
            result['children'].append({'text': value, 'section': section, 'index': index})
        else:
            result['children'].append(value)
    text_item(node.text)
    for child in node:
        converted = convert(child, section, excluded)
        if converted:
            result['children'].append(converted)
        text_item(child.tail)
    return result

body = doc.xpath('//body')[0]
roots = [node for node in body if node.get('id') in ('wrapper', 'main-menu') or 'ht-sticky-bar' in (node.get('class') or '').split()]
data = {'roots': [convert(node) for node in roots], 'texts': texts}
Path('src/data').mkdir(parents=True, exist_ok=True)
Path('src/data/storefront.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
styles = '\n'.join(node.text or '' for node in doc.xpath('//head/style'))
Path('src/styles').mkdir(parents=True, exist_ok=True)
Path('src/styles/legacy-head.css').write_text(styles, encoding='utf-8')
print('Imported sections:', ', '.join(f'{key}={value}' for key, value in counts.items()))
