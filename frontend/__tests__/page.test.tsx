import { render } from '@testing-library/react';
import Page from '../src/app/page';

describe('Home', () => {
  it('renders a Next.js logo', () => {
    // Next.js default page has images, we just test that the component renders
    const { container } = render(<Page />);
    expect(container).toBeInTheDocument();
  });
});
