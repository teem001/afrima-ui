import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Cart } from "@/components/Cart";

export function CartPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Back to search
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
      <Cart />
    </div>
  );
}
