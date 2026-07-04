import { Link } from 'react-router-dom';

export const NotFoundPage = (): JSX.Element => (
  <section className="px-6 py-12 text-center">
    <h1 className="text-3xl font-bold">404</h1>
    <p className="mt-2 text-neutral-600">Trang kh\u00f4ng t\u1ed3n t\u1ea1i.</p>
    <Link to="/" className="mt-4 inline-block underline">
      Quay v\u1ec1 trang ch\u1ee7
    </Link>
  </section>
);
