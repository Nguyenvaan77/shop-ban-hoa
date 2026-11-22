(function () {
  'use strict';
  var STORAGE_KEY = 'hoa-tuoi-cms-v1';
  var sections = [
    { id: 'header', name: 'Đầu trang & menu', selector: '#header' },
    { id: 'hero', name: 'Ảnh đầu trang', selector: '#section_1228191384' },
    { id: 'benefits', name: 'Cam kết dịch vụ', selector: '#section_137183005' },
    { id: 'categories', name: 'Danh mục hoa', selector: '#section_3512536' },
    { id: 'bouquets', name: 'Hoa bó', selector: '#section_1550835764' },
    { id: 'baskets', name: 'Giỏ hoa', selector: '#section_294454677' },
    { id: 'contact', name: 'Tư vấn đặt hoa', selector: '#section_1960654716' },
    { id: 'opening', name: 'Hoa khai trương', selector: '#section_1266025136' },
    { id: 'sympathy', name: 'Hoa viếng', selector: '#section_1073489451' },
    { id: 'steps', name: 'Các bước đặt hoa', selector: '#section_509498838' },
    { id: 'footer', name: 'Chân trang', selector: '#footer' }
  ];
  var nodes = {};
  var style = document.createElement('style');
  style.id = 'cms-custom-styles';
  document.head.appendChild(style);

  function collect(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || !node.nodeValue.trim() || parent.closest('style, script, noscript, svg, .screen-reader-text')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var list = [], node;
    while ((node = walker.nextNode())) list.push(node);
    return list;
  }
  sections.forEach(function (section) {
    var root = document.querySelector(section.selector);
    nodes[section.id] = root ? collect(root) : [];
  });
  var originals = {};
  Object.keys(nodes).forEach(function (id) { originals[id] = nodes[id].map(function (node) { return node.nodeValue; }); });
  function readSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (_) { return {}; }
  }
  function safeColor(value) { return /^#[0-9a-f]{6}$/i.test(value || '') ? value : ''; }
  var fonts = {
    vietnam: '"Be Vietnam Pro", sans-serif',
    sans: 'Arial, sans-serif',
    serif: 'Georgia, serif',
    times: '"Times New Roman", serif',
    system: 'system-ui, sans-serif'
  };
  function apply(changes) {
    changes = changes || {};
    var rules = [];
    sections.forEach(function (section) {
      var data = changes[section.id] || {};
      nodes[section.id].forEach(function (node, i) {
        node.nodeValue = data.text && Object.prototype.hasOwnProperty.call(data.text, i) ? data.text[i] : originals[section.id][i];
      });
      var selector = section.selector;
      var textColor = safeColor(data.textColor), background = safeColor(data.background), font = fonts[data.font];
      if (textColor) rules.push(selector + ', ' + selector + ' :not(i):not(svg):not(path) { color: ' + textColor + ' !important; }');
      if (font) rules.push(selector + ', ' + selector + ' *:not(i):not([class*="icon-"]) { font-family: ' + font + ' !important; }');
      if (background) {
        if (section.id === 'hero') {
          rules.push(selector + ' .section-bg::after { content: ""; position: absolute; inset: 0; background-color: ' + background + '; opacity: .45; pointer-events: none; }');
        } else if (section.id === 'contact') {
          rules.push(selector + ' .section-bg { background-color: ' + background + ' !important; }');
        } else if (section.id === 'header') {
          rules.push(selector + ' .header-bg-color, ' + selector + ' .header-top, ' + selector + ' .header-bottom { background-color: ' + background + ' !important; }');
        } else if (section.id === 'footer') {
          rules.push(selector + ' .footer-1, ' + selector + ' .absolute-footer { background-color: ' + background + ' !important; }');
        } else {
          rules.push(selector + ', ' + selector + ' > .section-bg { background-color: ' + background + ' !important; }');
        }
      }
    });
    style.textContent = rules.join('\n');
  }
  window.HoaTuoiCMS = {
    key: STORAGE_KEY,
    sections: sections,
    readSaved: readSaved,
    apply: apply,
    getTexts: function (id) {
      return (nodes[id] || []).map(function (node, i) { return { index: i, original: originals[id][i].trim(), value: node.nodeValue.trim() }; });
    },
    getSection: function (id) { var section = sections.find(function (item) { return item.id === id; }); return section && document.querySelector(section.selector); }
  };
  apply(readSaved());

  if (new URLSearchParams(location.search).has('cms-preview')) {
    document.addEventListener('click', function (event) {
      var match = sections.find(function (section) { var root = document.querySelector(section.selector); return root && root.contains(event.target); });
      if (match) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.parent.postMessage({ type: 'hoa-tuoi-select', id: match.id }, location.origin);
      }
    }, true);
  }
})();
