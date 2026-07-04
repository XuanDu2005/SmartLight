import { useParams } from 'react-router-dom';

export const ProductDetailPage = (): JSX.Element => {
  const { slug } = useParams<{ slug: string }>();
  return (
    <section className="px-6 py-12">
      <h1 className="text-2xl font-bold">Chi ti\u1ebft s\u1ea3n ph\u1ea9m</h1>
      <p className="mt-2 text-neutral-600">Slug: {slug ?? '\u2014'}</p>
    </section>
  );
};
