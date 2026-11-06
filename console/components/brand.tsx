import Link from "next/link";
import { BrandMark } from "./icons";

/** The console's brand link. Points at the public site, as the design specifies. */
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="AudioKit home">
      <span className="brand-mark">
        <BrandMark size={20} />
      </span>
      <span>AudioKit</span>
    </Link>
  );
}
