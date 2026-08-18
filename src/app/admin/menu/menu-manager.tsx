"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import { formatTRY } from "@/lib/utils";
import { Popup } from "@/components/ui/popup";

type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  stockTracked: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
};

type Category = {
  id: string;
  name: string;
  items: Item[];
};

export function MenuManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    stockTracked: false,
    stockQuantity: "0",
  });
  const [popup, setPopup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories);
      if (!itemForm.categoryId && json.categories[0]) {
        setItemForm((f) => ({ ...f, categoryId: json.categories[0].id }));
      }
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCategory() {
    if (!categoryName.trim()) {
      setError("Kategori adı yaz");
      return;
    }
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: categoryName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Kategori eklenemedi");
      return;
    }
    setCategoryName("");
    setError(null);
    await load();
    setPopup(`${data.name} kategorisi eklendi.`);
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    await load();
  }

  async function addItem() {
    if (!itemForm.categoryId || !itemForm.name || !itemForm.price) {
      setError("Kategori, ad ve fiyat gerekli");
      return;
    }
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        categoryId: itemForm.categoryId,
        name: itemForm.name,
        description: itemForm.description || undefined,
        price: Number(itemForm.price),
        imageUrl: itemForm.imageUrl || undefined,
        stockTracked: itemForm.stockTracked,
        stockQuantity: Number(itemForm.stockQuantity) || 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Ürün eklenemedi");
      return;
    }
    setItemForm((f) => ({
      ...f,
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      stockQuantity: "0",
    }));
    setError(null);
    await load();
    setPopup(`${data.name} menüye eklendi.`);
  }

  async function toggleItem(item: Item) {
    await fetch(`/api/admin/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    await load();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    await load();
  }

  async function setItemPhoto(item: Item, imageUrl: string | null) {
    await fetch(`/api/admin/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    await load();
  }

  async function updateStock(
    item: Item,
    data: { stockTracked?: boolean; stockQuantity?: number },
  ) {
    await fetch(`/api/admin/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await load();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <Popup message={popup} onClose={() => setPopup(null)} />
      <div className="space-y-6">
        {categories.map((category) => (
          <Card key={category.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl">{category.name}</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void deleteCategory(category.id)}
              >
                Sil
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-t border-[var(--line)] pt-3"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    {item.imageUrl ? (
                      <div className="photo-box h-16 w-16 rounded-xl">
                        <img src={item.imageUrl} alt="" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[10px] text-[var(--muted)]">
                        Foto
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={item.available ? "" : "text-[var(--muted)] line-through"}>
                        {item.name}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {formatTRY(item.price)}
                        {item.description ? ` · ${item.description}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          className="font-medium text-[var(--accent)]"
                          onClick={() =>
                            void updateStock(item, {
                              stockTracked: !item.stockTracked,
                            })
                          }
                        >
                          {item.stockTracked ? "Stok takibini kapat" : "Stok takibi aç"}
                        </button>
                        {item.stockTracked ? (
                          <>
                            <span
                              className={
                                item.stockQuantity <= item.lowStockThreshold
                                  ? "font-semibold text-red-700"
                                  : "text-[var(--muted)]"
                              }
                            >
                              Stok: {item.stockQuantity}
                            </span>
                            <Input
                              aria-label={`${item.name} stok adedi`}
                              type="number"
                              min="0"
                              className="h-8 w-20"
                              defaultValue={item.stockQuantity}
                              onBlur={(event) =>
                                void updateStock(item, {
                                  stockQuantity: Math.max(
                                    0,
                                    Number(event.target.value) || 0,
                                  ),
                                })
                              }
                            />
                          </>
                        ) : null}
                      </div>
                      <label className="mt-2 inline-flex cursor-pointer text-xs font-medium text-[var(--accent)]">
                        {item.imageUrl ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (!file) return;
                            const body = new FormData();
                            body.set("file", file);
                            body.set("kind", "menu");
                            const res = await fetch("/api/admin/upload", {
                              method: "POST",
                              credentials: "include",
                              body,
                            });
                            const data = await res.json().catch(() => ({}));
                            if (res.ok && data.url) {
                              await setItemPhoto(item, data.url);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void toggleItem(item)}
                    >
                      {item.available ? "Gizle" : "Aç"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void deleteItem(item.id)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
              {category.items.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Bu kategoride ürün yok.</p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-serif text-xl">Kategori ekle</h3>
          <div className="mt-3">
            <Label>Ad</Label>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Örn. Soğuk içecekler"
            />
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          <Button className="mt-3 w-full" onClick={() => void addCategory()}>
            Ekle
          </Button>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-xl">Ürün ekle</h3>
          <div className="mt-3 space-y-3">
            <div>
              <Label>Kategori</Label>
              <select
                className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
                value={itemForm.categoryId}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, categoryId: e.target.value }))
                }
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Ad</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Fiyat (₺)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={itemForm.price}
                onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemForm.stockTracked}
                onChange={(event) =>
                  setItemForm((form) => ({
                    ...form,
                    stockTracked: event.target.checked,
                  }))
                }
              />
              Stok takibi kullan
            </label>
            {itemForm.stockTracked ? (
              <div>
                <Label>Başlangıç stok adedi</Label>
                <Input
                  type="number"
                  min="0"
                  value={itemForm.stockQuantity}
                  onChange={(event) =>
                    setItemForm((form) => ({
                      ...form,
                      stockQuantity: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            <ImageUpload
              label="Yemek fotoğrafı"
              kind="menu"
              value={itemForm.imageUrl || null}
              onChange={(url) => setItemForm((f) => ({ ...f, imageUrl: url ?? "" }))}
            />
            <Button className="w-full" onClick={() => void addItem()}>
              Ürün ekle
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
