import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TabNav } from './TabNav';
import type { AppTab } from './TabNav';

const Harness: React.FC<{ initial?: AppTab; onChange?: (tab: AppTab) => void }> = ({
  initial = 'current',
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<AppTab>(initial);
  return (
    <TabNav
      activeTab={activeTab}
      onSelect={(tab) => {
        setActiveTab(tab);
        onChange?.(tab);
      }}
    />
  );
};

describe('TabNav', () => {
  it('uses a roving tabindex so only the active tab is tabbable', () => {
    render(<Harness />);

    expect(screen.getByRole('tab', { name: 'Current weather' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves selection and focus with ArrowRight and ArrowLeft', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Current weather' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('compare');
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('current');
    expect(screen.getByRole('tab', { name: 'Current weather' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Current weather' })).toHaveAttribute('tabindex', '0');
  });

  it('wraps around from the last tab to the first', async () => {
    const onChange = vi.fn();
    render(<Harness initial="compare" onChange={onChange} />);

    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenLastCalledWith('current');
    expect(screen.getByRole('tab', { name: 'Current weather' })).toHaveFocus();
  });

  it('jumps to the ends with Home and End', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.tab();
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('compare');
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveFocus();

    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('current');
    expect(screen.getByRole('tab', { name: 'Current weather' })).toHaveFocus();
  });

  it('selects a tab on click', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(screen.getByRole('tab', { name: 'Compare' }));

    expect(onChange).toHaveBeenCalledWith('compare');
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveAttribute('aria-selected', 'true');
  });
});
