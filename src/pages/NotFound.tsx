import { Link } from "react-router-dom";
import { Marshmallow } from "../components/Brand";
import { useMeta } from "../lib/seo";

export default function NotFound({ what = "page" }: { what?: string }) {
  useMeta({ title: "Not found", noindex: true });
  return (
    <div className="wrap grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <div className="flex justify-center gap-2">
          <Marshmallow tone="blush" face className="h-16 w-16 animate-float" />
          <Marshmallow tone="sky" className="h-12 w-12 animate-float [animation-delay:1s]" />
        </div>
        <h1 className="mt-6 text-[40px] sm:text-[52px]">We couldn't find that {what}</h1>
        <p className="mx-auto mt-3 max-w-md text-[17px] text-choc-soft">It may have been moved, sold out or knitted into something new.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn btn-dark">Shop all cardigans</Link>
          <Link to="/" className="btn btn-light">Back home</Link>
        </div>
      </div>
    </div>
  );
}
