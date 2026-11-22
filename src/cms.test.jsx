// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Cms from './Cms';
import Storefront from './Storefront';
import { components, STORAGE_KEY } from './cms-data';

beforeEach(() => { localStorage.clear(); HTMLElement.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('individual component editing', () => {
  it('saves, reviews and restores an individual button without changing its section', () => {
    render(<Cms />);
    fireEvent.click(screen.getByRole('button', { name: /Ảnh đầu trang/ }));
    const button = components.hero.find(item => item.type === 'Nút');
    expect(button).toBeDefined();
    fireEvent.change(screen.getByLabelText('Thành phần'), { target: { value: button.id } });
    fireEvent.change(screen.getByLabelText('Chỉnh nội dung'), { target: { value: 'Đặt hoa ngay' } });
    fireEvent.change(screen.getByLabelText('Màu nền'), { target: { value: '#aabbcc' } });
    fireEvent.change(screen.getByLabelText('Font chữ'), { target: { value: 'serif' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.hero.components[button.id]).toEqual({ text: 'Đặt hoa ngay', background: '#aabbcc', font: 'serif' });
    expect(saved.hero.background).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: /Xem thay đổi/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Đặt hoa ngay/)).toBeTruthy();
    expect(within(dialog).getByText('#AABBCC')).toBeTruthy();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Đóng' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục thành phần này' }));
    expect(screen.getByLabelText('Chỉnh nội dung').value).toBe(button.original);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({});
  });

  it('renders saved component text and styles only on its matching element', () => {
    const button = components.hero.find(item => item.type === 'Nút');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hero: { components: { [button.id]: { text: 'Đặt hoa riêng', background: '#aabbcc', font: 'serif' } } } }));
    const { container } = render(<Storefront />);
    const target = container.querySelector(`[data-cms-component="${button.id}"]`);
    expect(target.textContent).toContain('Đặt hoa riêng');
    expect(container.querySelector('#section_1228191384').textContent).toContain('Gửi trọn yêu thương');
    const css = [...container.querySelectorAll('style')].map(style => style.textContent).join('\n');
    expect(css).toContain(`[data-cms-component="${button.id}"]`);
    expect(css).toContain('#aabbcc');
    expect(css).toContain('Georgia, serif');
  });

  it('selects the clicked button in preview without following its link', () => {
    window.history.replaceState({}, '', '/?cms-preview=1');
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    const button = components.hero.find(item => item.type === 'Nút');
    const { container } = render(<Storefront />);
    const target = container.querySelector(`[data-cms-component="${button.id}"]`);
    fireEvent.click(target);
    expect(post).toHaveBeenCalledWith({ type: 'hoa-tuoi-select', id: 'hero', componentId: button.id }, window.location.origin);
    window.history.replaceState({}, '', '/');
  });

  it('restores one reviewed change at a time and saves only after confirmation', () => {
    const button = components.hero.find(item => item.type === 'Nút');
    const original = { hero: { text: { 0: 'Lời chào mới' }, background: '#112233', components: { [button.id]: { text: '', textColor: '#aabbcc', font: 'serif' } } } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(original));
    render(<Cms />);
    fireEvent.click(screen.getByRole('button', { name: /Xem thay đổi/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Khôi phục màu chữ - Ảnh đầu trang, Nút/ }));
    expect(within(dialog).queryByText('#AABBCC')).toBeNull();
    expect(within(dialog).getByText('#112233')).toBeTruthy();
    expect(within(dialog).getByText('Georgia')).toBeTruthy();
    expect(within(dialog).getByText(/để trống/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(original);
    expect(screen.getByRole('status').textContent).toBe('Có thay đổi chưa lưu');
    fireEvent.click(within(dialog).getByRole('button', { name: /Khôi phục nội dung - Ảnh đầu trang, Nút/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Khôi phục nội dung - Ảnh đầu trang:/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Khôi phục màu nền - Ảnh đầu trang' }));
    expect(within(dialog).getByText('Georgia')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /Khôi phục font chữ - Ảnh đầu trang, Nút/ }));
    expect(within(dialog).getByText(/Chưa có thay đổi nào/)).toBeTruthy();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Đóng' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({});
  });

  it('restores selected changes across components and sections, then supports select all', () => {
    const button = components.hero.find(item => item.type === 'Nút');
    const original = { hero: { background: '#112233', components: { [button.id]: { text: 'Đặt ngay', font: 'serif' } } }, footer: { textColor: '#aabbcc' } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(original));
    render(<Cms />);
    fireEvent.click(screen.getByRole('button', { name: /Xem thay đổi/ }));
    const dialog = screen.getByRole('dialog');
    const bulk = within(dialog).getByRole('button', { name: /Khôi phục đã chọn/ });
    expect(bulk.disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Chọn nội dung - Ảnh đầu trang, Nút/ }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Chọn màu chữ - Chân trang' }));
    expect(bulk.textContent).toContain('(2)');
    fireEvent.click(bulk);
    expect(within(dialog).queryByText(/Đặt ngay/)).toBeNull();
    expect(within(dialog).queryByText('#AABBCC')).toBeNull();
    expect(within(dialog).getByText('#112233')).toBeTruthy();
    expect(within(dialog).getByText('Georgia')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(original);
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Chọn tất cả' }));
    expect(bulk.textContent).toContain('(2)');
    fireEvent.click(bulk);
    expect(within(dialog).getByText(/Chưa có thay đổi nào/)).toBeTruthy();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Đóng' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({});
  });
});
