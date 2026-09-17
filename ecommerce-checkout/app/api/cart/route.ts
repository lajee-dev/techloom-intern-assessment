import { cookies } from "next/headers";

const CART_COOKIE = "checkout_cart";

type CartItem = { productId: string; quantity: number };

function readCart(value?: string): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CartItem).productId === "string" &&
        Number.isInteger((item as CartItem).quantity) &&
        (item as CartItem).quantity > 0
    );
  } catch {
    return [];
  }
}

function writeCart(cart: CartItem[]) {
  return JSON.stringify(cart);
}

export async function GET() {
  const cookieStore = await cookies();
  return Response.json({ cart: readCart(cookieStore.get(CART_COOKIE)?.value) });
}

async function updateCart(
  request: Request,
  operation: "add" | "update" | "remove"
) {
  const body = (await request.json()) as Partial<CartItem>;
  const productId = body.productId;
  const quantity = body.quantity;
  const requestedQuantity = quantity ?? 0;

  if (typeof productId !== "string" || !productId.trim()) {
    return Response.json({ error: "productId is required" }, { status: 400 });
  }

  if (operation !== "remove" && (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0)) {
    return Response.json({ error: "quantity must be a positive integer" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cart = readCart(cookieStore.get(CART_COOKIE)?.value);
  const itemIndex = cart.findIndex((item) => item.productId === productId);

  if (operation === "remove") {
    if (itemIndex >= 0) {
      cart.splice(itemIndex, 1);
    }
  } else if (operation === "add") {
    if (itemIndex >= 0) {
      cart[itemIndex].quantity += requestedQuantity;
    } else {
      cart.push({ productId, quantity: requestedQuantity });
    }
  } else if (itemIndex >= 0) {
    cart[itemIndex].quantity = requestedQuantity;
  } else {
    cart.push({ productId, quantity: requestedQuantity });
  }

  cookieStore.set(CART_COOKIE, writeCart(cart), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ cart });
}

export async function POST(request: Request) {
  return updateCart(request, "add");
}

export async function PATCH(request: Request) {
  return updateCart(request, "update");
}

export async function DELETE(request: Request) {
  return updateCart(request, "remove");
}