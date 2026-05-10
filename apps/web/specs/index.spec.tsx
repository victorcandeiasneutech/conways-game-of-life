import { render } from '@testing-library/react';
import Page from '../app/page';

describe('Page', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Page />);
    expect(baseElement).toBeTruthy();
  });

  it('should render the generation counter', () => {
    const { getByTestId } = render(<Page />);
    expect(getByTestId('gen-count').textContent).toBe('0');
  });
});
