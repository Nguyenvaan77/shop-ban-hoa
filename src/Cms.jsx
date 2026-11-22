import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cleanChanges, components, countChanges, fonts, readSaved, sections, STORAGE_KEY, texts } from './cms-data';
import './styles/cms.css';

const changeId = ({ sectionId, key, componentId = null, textIndex = null }) => JSON.stringify([sectionId, componentId, key, textIndex]);

function listChanges(changes) {
  return sections.flatMap(({ id: sectionId }) => {
    const change = changes[sectionId] || {};
    return [
      ...Object.keys(change.text || {}).map(textIndex => ({ sectionId, key: 'text', textIndex })),
      ...['textColor', 'background', 'font'].filter(key => change[key]).map(key => ({ sectionId, key })),
      ...Object.entries(change.components || {}).flatMap(([componentId, item]) => ['text', 'textColor', 'background', 'font'].filter(key => Object.hasOwn(item, key)).map(key => ({ sectionId, componentId, key })))
    ];
  });
}

function removeChange(previous, { sectionId, key, componentId, textIndex }) {
  const item = { ...(previous[sectionId] || {}) };
  if (componentId) {
    const changedComponents = { ...(item.components || {}) };
    const target = { ...(changedComponents[componentId] || {}) };
    delete target[key];
    changedComponents[componentId] = target;
    item.components = changedComponents;
  } else if (key === 'text') {
    const changedText = { ...(item.text || {}) };
    delete changedText[textIndex];
    item.text = changedText;
  } else {
    delete item[key];
  }
  return cleanChanges({ ...previous, [sectionId]: item });
}

export default function Cms() {
  const [cmsChanges, setCmsChanges] = useState(readSaved);
  const [saved, setSaved] = useState(readSaved);
  const [current, setCurrent] = useState(null);
  const [componentId, setComponentId] = useState('');
  const [textIndex, setTextIndex] = useState('0');
  const [device, setDevice] = useState('desktop');
  const [showChanges, setShowChanges] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState(() => new Set());
  const [saveError, setSaveError] = useState('');
  const frame = useRef(null);
  const editor = useRef(null);
  const draft = useRef(cmsChanges);
  draft.current = cmsChanges;
  const post = useCallback(message => frame.current?.contentWindow?.postMessage(message, window.location.origin), []);
  const selectSection = useCallback((id, scroll = true, selectedComponent = '') => {
    if (!sections.some(section => section.id === id)) return;
    const validComponent = components[id].some(component => component.id === selectedComponent) ? selectedComponent : '';
    setCurrent(id); setComponentId(validComponent); setTextIndex('0');
    post({ type: 'hoa-tuoi-focus', componentId: validComponent });
    if (scroll) post({ type: 'hoa-tuoi-scroll', id });
  }, [post]);
  useEffect(() => {
    function receive(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'hoa-tuoi-select') selectSection(event.data.id, false, event.data.componentId);
      if (event.data?.type === 'hoa-tuoi-ready') post({ type: 'hoa-tuoi-draft', changes: draft.current });
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [post, selectSection]);
  useEffect(() => { post({ type: 'hoa-tuoi-draft', changes: cmsChanges }); }, [cmsChanges, post]);
  useEffect(() => { if (current) editor.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [current, componentId]);
  useEffect(() => {
    function beforeUnload(event) {
      if (JSON.stringify(cmsChanges) !== JSON.stringify(saved)) { event.preventDefault(); event.returnValue = ''; }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [cmsChanges, saved]);
  const sectionData = cmsChanges[current] || {};
  const component = components[current]?.find(item => item.id === componentId);
  const data = component ? sectionData.components?.[componentId] || {} : sectionData;
  const section = sections.find(item => item.id === current);
  const sectionTexts = texts[current] || [];
  const update = (key, value) => setCmsChanges(previous => {
    const item = { ...(previous[current] || {}) };
    if (component) {
      const changedComponents = { ...(item.components || {}) }, target = { ...(changedComponents[componentId] || {}) };
      if (value) target[key] = value; else delete target[key];
      changedComponents[componentId] = target; item.components = changedComponents;
    } else if (value) item[key] = value; else delete item[key];
    return cleanChanges({ ...previous, [current]: item });
  });
  const updateText = value => setCmsChanges(previous => {
    if (component) {
      const item = { ...(previous[current] || {}) }, changedComponents = { ...(item.components || {}) }, target = { ...(changedComponents[componentId] || {}) };
      if (value === component.original) delete target.text; else target.text = value;
      changedComponents[componentId] = target; item.components = changedComponents;
      return cleanChanges({ ...previous, [current]: item });
    }
    const item = { ...(previous[current] || {}) }, changedText = { ...(item.text || {}) };
    if (value === sectionTexts[Number(textIndex)]) delete changedText[textIndex]; else changedText[textIndex] = value;
    item.text = changedText;
    return cleanChanges({ ...previous, [current]: item });
  });
  const resetSection = () => setCmsChanges(previous => {
    const next = { ...previous };
    if (component) { const item = { ...(next[current] || {}) }, changedComponents = { ...(item.components || {}) }; delete changedComponents[componentId]; item.components = changedComponents; next[current] = item; }
    else delete next[current];
    return cleanChanges(next);
  });
  const allChanges = listChanges(cmsChanges);
  const selected = allChanges.filter(change => selectedChanges.has(changeId(change)));
  const toggleChange = (change, checked) => setSelectedChanges(previous => {
    const next = new Set(previous);
    if (checked) next.add(changeId(change)); else next.delete(changeId(change));
    return next;
  });
  const restoreChange = change => {
    setCmsChanges(previous => removeChange(previous, change));
    setSelectedChanges(previous => { const next = new Set(previous); next.delete(changeId(change)); return next; });
  };
  const restoreSelected = () => {
    setCmsChanges(previous => selected.reduce(removeChange, previous));
    setSelectedChanges(new Set());
  };
  const rowProps = change => ({ checked: selectedChanges.has(changeId(change)), onSelect: checked => toggleChange(change, checked), onRestore: () => restoreChange(change) });
  const selectComponent = value => { setComponentId(value); post({ type: 'hoa-tuoi-focus', componentId: value }); if (value) post({ type: 'hoa-tuoi-scroll', id: current, componentId: value }); };
  const save = () => {
    try { const clean = cleanChanges(cmsChanges); localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); setSaved(clean); setCmsChanges(clean); setSaveError(''); }
    catch { setSaveError('Không thể lưu trên trình duyệt'); }
  };
  const count = countChanges(cmsChanges);
  const status = saveError || (JSON.stringify(cmsChanges) !== JSON.stringify(saved) ? 'Có thay đổi chưa lưu' : count ? 'Đã lưu trên trình duyệt' : 'Chưa có thay đổi');
  return <>
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-mark">✿</span><span>Hoa Tươi <small>CONTENT STUDIO</small></span></a>
      <div className="top-actions"><span className="save-status" role="status">{status}</span><button className="button button-light" onClick={() => { setSelectedChanges(new Set()); setShowChanges(true); }}>Xem thay đổi <span>{count}</span></button><button className="button button-primary" onClick={save}>Lưu thay đổi</button></div>
    </header>
    <main className="workspace">
      <aside className="sidebar">
        <div className="sidebar-intro"><div className="eyebrow">TRANG CHỦ</div><h1>Chỉnh sửa giao diện</h1><p>Chọn khu vực hoặc nhấp vào từng thành phần trong bản xem trước.</p></div>
        <div className="sidebar-scroll">
          <div className="section-heading"><span>CẤU TRÚC TRANG</span><span>{sections.length} KHU VỰC</span></div>
          <nav aria-label="Các khu vực trang">{sections.map(item => <button key={item.id} className={'section-item' + (item.id === current ? ' active' : '')} onClick={() => selectSection(item.id)}><span className="section-icon">{item.icon}</span><span>{item.name}</span><span className="chevron">›</span></button>)}</nav>
          {section && <div className="editor" ref={editor}>
            <div className="editor-header"><div><span className="eyebrow">ĐANG CHỈNH SỬA</span><h2>{section.name}</h2></div><button className="icon-button" aria-label="Đóng bảng chỉnh sửa" onClick={() => { setCurrent(null); post({ type: 'hoa-tuoi-focus', componentId: null }); }}>×</button></div>
            <label htmlFor="component-select">Thành phần</label><select id="component-select" value={componentId} onChange={event => selectComponent(event.target.value)}><option value="">Toàn bộ khu vực</option>{components[current].map(item => <option key={item.id} value={item.id}>{item.type}: {item.original.length > 45 ? item.original.slice(0, 45) + '…' : item.original}</option>)}</select>
            <p className="field-hint component-hint">Chọn một thành phần hoặc nhấp trực tiếp vào bản xem trước.</p>
            <label htmlFor={component ? 'text-value' : 'text-select'}>Nội dung</label>{!component && <select id="text-select" value={textIndex} onChange={event => setTextIndex(event.target.value)} disabled={!sectionTexts.length}>{sectionTexts.map((text, index) => <option value={index} key={index}>{index + 1}. {text.length > 52 ? text.slice(0, 52) + '…' : text}</option>)}</select>}
            <textarea id="text-value" aria-label="Chỉnh nội dung" rows="3" value={component ? Object.hasOwn(data, 'text') ? data.text : component.original : data.text && Object.hasOwn(data.text, textIndex) ? data.text[textIndex] : sectionTexts[Number(textIndex)] || ''} onChange={event => updateText(event.target.value)} disabled={!component && !sectionTexts.length} />
            <p className="field-hint">{component ? 'Nội dung chỉ thay đổi ở thành phần đang chọn.' : 'Chọn đoạn nội dung trong khu vực này để chỉnh sửa.'}</p><div className="editor-divider" />
            <ColorField label="Màu chữ" id="text-color" scope={component ? 'thành phần' : 'khu vực'} value={data.textColor || (current === 'contact' ? '#fff9f5' : '#48483e')} onChange={value => update('textColor', value)} />
            <ColorField label="Màu nền" id="background" scope={component ? 'thành phần' : 'khu vực'} value={data.background || (current === 'contact' ? '#315b2a' : current === 'header' || current === 'footer' ? '#f6d5e4' : current === 'steps' ? '#e6e2d8' : '#fff9f5')} onChange={value => update('background', value)} />
            <label htmlFor="font">Font chữ</label><select id="font" value={data.font || ''} onChange={event => update('font', event.target.value)}><option value="">Theo giao diện gốc</option>{Object.entries(fonts).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>
            <button className="reset-button" onClick={resetSection}>Khôi phục {component ? 'thành phần' : 'khu vực'} này</button>
          </div>}
        </div><div className="sidebar-footer"><span className="help-icon">i</span><p>Nhấp vào một khu vực trong bản xem trước để chỉnh sửa nhanh.</p></div>
      </aside>
      <section className="preview-panel" aria-label="Xem trước giao diện">
        <div className="preview-toolbar"><div><div className="preview-title">Bản xem trước <span className="live-dot" /><span className="live-label">TRỰC TIẾP</span></div><p>Thay đổi hiển thị ngay khi bạn chỉnh sửa</p></div><div className="device-controls" role="group" aria-label="Kích thước xem trước">{[['desktop', '▱', 'Máy tính'], ['mobile', '▯', 'Điện thoại']].map(([id, icon, label]) => <button key={id} className={'device' + (device === id ? ' active' : '')} onClick={() => setDevice(id)} aria-label={label} title={label}>{icon}</button>)}</div></div>
        <div className="preview-stage"><div className={'browser-frame' + (device === 'mobile' ? ' mobile' : '')}><div className="browser-bar"><span className="browser-dots"><i /><i /><i /></span><span className="browser-address">hoatuoi.vn <span>/ trang chủ</span></span><span className="browser-spacer" /></div><iframe ref={frame} src="/?cms-preview=1" title="Xem trước website Hoa Tươi" onLoad={() => post({ type: 'hoa-tuoi-draft', changes: draft.current })} /></div></div>
      </section>
    </main>
    {showChanges && <div className="dialog-backdrop" onClick={() => setShowChanges(false)}>
      <div className="changes-dialog" role="dialog" aria-modal="true" aria-labelledby="changes-title" onClick={event => event.stopPropagation()}>
        <div className="dialog-head"><div><span className="eyebrow">TỔNG QUAN</span><h2 id="changes-title">Thay đổi của bạn</h2><p>Chọn các thay đổi cần khôi phục, sau đó nhấn Lưu thay đổi để lưu kết quả.</p></div><button className="icon-button" aria-label="Đóng" onClick={() => setShowChanges(false)}>×</button></div>
        {count > 0 && <div className="changes-toolbar"><label className="select-all"><input type="checkbox" checked={selected.length === allChanges.length && allChanges.length > 0} onChange={event => setSelectedChanges(event.target.checked ? new Set(allChanges.map(changeId)) : new Set())} /> Chọn tất cả</label><button className="bulk-restore" type="button" disabled={!selected.length} onClick={restoreSelected}>Khôi phục đã chọn ({selected.length})</button></div>}
        <div className="changes-list">{count ? sections.filter(item => cmsChanges[item.id]).map(item => {
          const change = cmsChanges[item.id];
          return <div className="change-group" key={item.id}>
            <h3>{item.name}</h3>
            {Object.entries(change.text || {}).map(([index, value]) => <ChangeRow key={index} label="Nội dung" context={`${item.name}: ${texts[item.id][index]}`} value={`${texts[item.id][index]} → ${value || '(để trống)'}`} {...rowProps({ sectionId: item.id, key: 'text', textIndex: index })} />)}
            {change.textColor && <ChangeRow label="Màu chữ" context={item.name} value={change.textColor.toUpperCase()} {...rowProps({ sectionId: item.id, key: 'textColor' })} />}
            {change.background && <ChangeRow label="Màu nền" context={item.name} value={change.background.toUpperCase()} {...rowProps({ sectionId: item.id, key: 'background' })} />}
            {change.font && <ChangeRow label="Font chữ" context={item.name} value={fonts[change.font]} {...rowProps({ sectionId: item.id, key: 'font' })} />}
            {Object.entries(change.components || {}).map(([id, componentChange]) => {
              const target = components[item.id].find(component => component.id === id);
              const name = target ? `${target.type}: ${target.original}` : id;
              const componentRow = key => rowProps({ sectionId: item.id, componentId: id, key });
              return <div className="component-changes" key={id}>
                <h4>{name}</h4>
                {Object.hasOwn(componentChange, 'text') && <ChangeRow label="Nội dung" context={`${item.name}, ${name}`} value={`${target?.original || ''} → ${componentChange.text || '(để trống)'}`} {...componentRow('text')} />}
                {componentChange.textColor && <ChangeRow label="Màu chữ" context={`${item.name}, ${name}`} value={componentChange.textColor.toUpperCase()} {...componentRow('textColor')} />}
                {componentChange.background && <ChangeRow label="Màu nền" context={`${item.name}, ${name}`} value={componentChange.background.toUpperCase()} {...componentRow('background')} />}
                {componentChange.font && <ChangeRow label="Font chữ" context={`${item.name}, ${name}`} value={fonts[componentChange.font]} {...componentRow('font')} />}
              </div>;
            })}
          </div>;
        }) : <div className="empty-state">Chưa có thay đổi nào. Hãy chọn một khu vực để bắt đầu.</div>}</div>
        <div className="dialog-footer"><button className="button button-light" onClick={() => setShowChanges(false)}>Đóng</button></div>
      </div>
    </div>}
  </>;
}
function ColorField({ label, id, value, onChange, scope }) { return <div className="field-row"><div><label htmlFor={id}>{label}</label><p className="field-hint">Áp dụng cho {scope}</p></div><div className="color-control"><input type="color" id={id} value={value} onChange={event => onChange(event.target.value)} /><span>{value.toUpperCase()}</span></div></div>; }
function ChangeRow({ label, value, context, onRestore, checked, onSelect }) { return <div className="change-row"><input className="change-checkbox" type="checkbox" aria-label={`Chọn ${label.toLowerCase()} - ${context}`} checked={checked} onChange={event => onSelect(event.target.checked)} /><strong>{label}</strong><span>{value}</span><button className="restore-change" type="button" aria-label={`Khôi phục ${label.toLowerCase()} - ${context}`} onClick={onRestore}>Khôi phục</button></div>; }
