'use strict';
// Biến chứa toàn bộ thay đổi đang chỉnh sửa; chỉ ghi vào trình duyệt khi bấm Lưu.
var cmsChanges = {};
var savedChanges = {};
var currentSection = null;
var api = null;
var $ = function (id) { return document.getElementById(id); };
var clone = function (value) { return JSON.parse(JSON.stringify(value)); };
var fonts = { vietnam: 'Be Vietnam Pro', sans: 'Arial', serif: 'Georgia', times: 'Times New Roman', system: 'System UI' };
var icons = ['▤', '▧', '✧', '▦', '♧', '♧', '☏', '♧', '♧', '☷', '▤'];

function clean() {
  Object.keys(cmsChanges).forEach(function (id) {
    var item = cmsChanges[id];
    if (item.text && !Object.keys(item.text).length) delete item.text;
    if (!Object.keys(item).length) delete cmsChanges[id];
  });
}
function countChanges() {
  return Object.values(cmsChanges).reduce(function (count, item) {
    return count + (item.text ? Object.keys(item.text).length : 0) + ['textColor', 'background', 'font'].filter(function (key) { return !!item[key]; }).length;
  }, 0);
}
function updateStatus() {
  clean();
  $('change-count').textContent = countChanges();
  $('save-status').textContent = JSON.stringify(cmsChanges) !== JSON.stringify(savedChanges) ? 'Có thay đổi chưa lưu' : (countChanges() ? 'Đã lưu trên trình duyệt' : 'Chưa có thay đổi');
}
function refreshPreview() { if (api) api.apply(cmsChanges); updateStatus(); }
function sectionData() { return cmsChanges[currentSection] || (cmsChanges[currentSection] = {}); }
function renderSections() {
  $('sections').replaceChildren();
  api.sections.forEach(function (section, i) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'section-item' + (section.id === currentSection ? ' active' : '');
    var icon = document.createElement('span'); icon.className = 'section-icon'; icon.textContent = icons[i];
    var label = document.createElement('span'); label.textContent = section.name;
    var chevron = document.createElement('span'); chevron.className = 'chevron'; chevron.textContent = '›';
    button.append(icon, label, chevron);
    button.addEventListener('click', function () { selectSection(section.id, true); });
    $('sections').appendChild(button);
  });
}
function selectSection(id, scrollPreview) {
  var section = api.sections.find(function (item) { return item.id === id; });
  if (!section) return;
  currentSection = id;
  renderSections();
  $('editor').hidden = false;
  $('editor-title').textContent = section.name;
  var texts = api.getTexts(id);
  $('text-select').replaceChildren();
  texts.forEach(function (item, i) {
    var option = document.createElement('option'); option.value = item.index;
    option.textContent = (i + 1) + '. ' + (item.original.length > 52 ? item.original.slice(0, 52) + '…' : item.original);
    $('text-select').appendChild(option);
  });
  $('text-select').disabled = !texts.length;
  $('text-value').disabled = !texts.length;
  $('text-value').value = texts.length ? texts[0].value : '';
  var data = cmsChanges[id] || {};
  $('text-color').value = data.textColor || (id === 'contact' ? '#fff9f5' : '#48483e');
  $('background').value = data.background || (id === 'contact' ? '#315b2a' : id === 'header' || id === 'footer' ? '#f6d5e4' : id === 'steps' ? '#e6e2d8' : '#fff9f5');
  $('text-color-value').textContent = $('text-color').value.toUpperCase();
  $('background-value').textContent = $('background').value.toUpperCase();
  $('font').value = data.font || '';
  if (scrollPreview) { var element = api.getSection(id); if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('preview').addEventListener('load', function () {
  try {
    api = $('preview').contentWindow.HoaTuoiCMS;
    if (!api) throw new Error('Không tải được dữ liệu xem trước');
    savedChanges = api.readSaved(); cmsChanges = clone(savedChanges);
    renderSections(); refreshPreview();
  } catch (error) { $('save-status').textContent = 'Không tải được bản xem trước'; }
});
window.addEventListener('message', function (event) {
  if (event.origin === location.origin && event.source === $('preview').contentWindow && event.data && event.data.type === 'hoa-tuoi-select' && api) selectSection(event.data.id, false);
});
$('close-editor').addEventListener('click', function () { currentSection = null; $('editor').hidden = true; renderSections(); });
$('text-select').addEventListener('change', function () {
  var item = api.getTexts(currentSection).find(function (entry) { return String(entry.index) === $('text-select').value; });
  $('text-value').value = item ? item.value : '';
});
$('text-value').addEventListener('input', function () {
  if (!currentSection || !api) return;
  var index = $('text-select').value;
  var original = api.getTexts(currentSection).find(function (item) { return String(item.index) === index; }).original;
  var data = sectionData(); data.text = data.text || {};
  if ($('text-value').value === original) delete data.text[index]; else data.text[index] = $('text-value').value;
  refreshPreview();
});
['text-color', 'background'].forEach(function (id) {
  $(id).addEventListener('input', function () {
    if (!currentSection) return;
    sectionData()[id === 'text-color' ? 'textColor' : 'background'] = this.value;
    $(id + '-value').textContent = this.value.toUpperCase(); refreshPreview();
  });
});
$('font').addEventListener('change', function () { if (!currentSection) return; if (this.value) sectionData().font = this.value; else delete sectionData().font; refreshPreview(); });
$('reset-section').addEventListener('click', function () { if (!currentSection) return; delete cmsChanges[currentSection]; refreshPreview(); selectSection(currentSection, false); });
$('save').addEventListener('click', function () {
  if (!api) return;
  try { clean(); localStorage.setItem(api.key, JSON.stringify(cmsChanges)); savedChanges = clone(cmsChanges); updateStatus(); }
  catch (_) { $('save-status').textContent = 'Không thể lưu trên trình duyệt'; }
});
function addChange(container, label, value) {
  var row = document.createElement('div'); row.className = 'change-row';
  var title = document.createElement('strong'); title.textContent = label;
  var detail = document.createElement('span'); detail.textContent = value;
  row.append(title, detail); container.appendChild(row);
}
$('show-changes').addEventListener('click', function () {
  if (!api) return;
  var list = $('changes-list'); list.replaceChildren();
  api.sections.forEach(function (section) {
    var data = cmsChanges[section.id]; if (!data) return;
    var group = document.createElement('div'); group.className = 'change-group';
    var title = document.createElement('h3'); title.textContent = section.name; group.appendChild(title);
    var texts = api.getTexts(section.id);
    Object.keys(data.text || {}).forEach(function (index) {
      var original = texts.find(function (item) { return String(item.index) === index; });
      addChange(group, 'Nội dung', (original ? original.original : '') + ' → ' + (data.text[index] || '(để trống)'));
    });
    if (data.textColor) addChange(group, 'Màu chữ', data.textColor.toUpperCase());
    if (data.background) addChange(group, 'Màu nền', data.background.toUpperCase());
    if (data.font) addChange(group, 'Font chữ', fonts[data.font]);
    list.appendChild(group);
  });
  if (!list.children.length) { var empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = 'Chưa có thay đổi nào. Hãy chọn một khu vực để bắt đầu.'; list.appendChild(empty); }
  $('changes-dialog').showModal();
});
['close-dialog', 'done-dialog'].forEach(function (id) { $(id).addEventListener('click', function () { $('changes-dialog').close(); }); });
document.querySelectorAll('.device').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('.device').forEach(function (item) { item.classList.remove('active'); }); button.classList.add('active'); $('frame-wrap').classList.toggle('mobile', button.dataset.width === 'mobile'); }); });
