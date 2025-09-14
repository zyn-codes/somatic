import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Somatic Client Form heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/Somatic Client Form/i);
  expect(headingElement).toBeInTheDocument();
});
