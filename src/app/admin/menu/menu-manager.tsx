"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import { formatTRY } from "@/lib/utils";
import { Popup } from "@/components/ui/popup";
import { NutritionEditor } from "@/components/nutrition-editor";
import { NutritionLabels } from "@/components/nutrition-labels";
import {
  EMPTY_NUTRITION,
  nutritionFromRow,
  type NutritionInfo,
} from "@/lib/nutrition";

type Item = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  stockTracked: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  allergens: string[];
  animalSource: string | null;
  containsAlcohol: boolean;
  containsPork: boolean;
  calories: number | null;
  optionGroups: {
    id: string;
    name: string;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: {
      id: string;
      name: string;
      priceDelta: number;
      available: boolean;
    }[];
  }[];
};

type Category = {
  id: string;
  name: string;
  items: Item[];
};

type EditForm = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  nutrition: NutritionInfo;
  optionGroups: {
    key: string;
    name: string;
    required: boolean;
    minSelections: string;
    maxSelections: string;
    options: {
      key: string;
      name: string;
      priceDelta: string;
    }[];
  }[];
};

function formKey() {
  return crypto.randomUUID();
}

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
    nutrition: EMPTY_NUTRITION,
  });
  const [popup, setPopup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

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
    const pollId = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(pollId);
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
    if (itemForm.nutrition.calories == null) {
      setError("Porsiyon kalorisi gerekli");
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
        allergens: itemForm.nutrition.allergens,
        animalSource: itemForm.nutrition.animalSource,
        containsAlcohol: itemForm.nutrition.containsAlcohol,
        containsPork: itemForm.nutrition.containsPork,
        calories: itemForm.nutrition.calories,
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
      nutrition: EMPTY_NUTRITION,
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

  function editItem(item: Item) {
    setError(null);
    setEditForm({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      nutrition: nutritionFromRow(item),
      optionGroups: item.optionGroups.map((group) => ({
        key: group.id,
        name: group.name,
        required: group.required,
        minSelections: String(group.minSelections),
        maxSelections: String(group.maxSelections),
        options: group.options.map((option) => ({
          key: option.id,
          name: option.name,
          priceDelta: String(option.priceDelta),
        })),
      })),
    });
  }

  async function saveItem() {
    if (!editForm) return;
    const optionGroups = editForm.optionGroups.map((group) => ({
      name: group.name.trim(),
      required: group.required,
      minSelections: Math.max(0, Number(group.minSelections) || 0),
      maxSelections: Math.max(1, Number(group.maxSelections) || 1),
      options: group.options.map((option) => ({
        name: option.name.trim(),
        priceDelta: Math.max(0, Number(option.priceDelta) || 0),
      })),
    }));
    if (
      !editForm.name.trim() ||
      !Number(editForm.price) ||
      optionGroups.some(
        (group) =>
          !group.name ||
          !group.options.length ||
          group.options.some((option) => !option.name),
      )
    ) {
      setError("Ürün ve seçenek adlarını eksiksiz doldurun");
      return;
    }
    if (editForm.nutrition.calories == null) {
      setError("Porsiyon kalorisi gerekli");
      return;
    }
    const response = await fetch(`/api/admin/items/${editForm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        categoryId: editForm.categoryId,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        price: Number(editForm.price),
        optionGroups,
        allergens: editForm.nutrition.allergens,
        animalSource: editForm.nutrition.animalSource,
        containsAlcohol: editForm.nutrition.containsAlcohol,
        containsPork: editForm.nutrition.containsPork,
        calories: editForm.nutrition.calories,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Ürün kaydedilemedi");
      return;
    }
    setEditForm(null);
    setError(null);
    await load();
    setPopup(`${data.name} güncellendi.`);
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <Popup message={popup} onClose={() => setPopup(null)} />
      <div className="space-y-6">
        {editForm ? (
          <Card className="border-[var(--accent)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">Ürünü düzenle</h2>
              <Button variant="ghost" onClick={() => setEditForm(null)}>
                Kapat
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Kategori</Label>
                <select
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
                  value={editForm.categoryId}
                  onChange={(event) =>
                    setEditForm((form) =>
                      form
                        ? { ...form, categoryId: event.target.value }
                        : form,
                    )
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Ürün adı</Label>
                <Input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((form) =>
                      form ? { ...form, name: event.target.value } : form,
                    )
                  }
                />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((form) =>
                      form
                        ? { ...form, description: event.target.value }
                        : form,
                    )
                  }
                />
              </div>
              <div>
                <Label>Fiyat (₺)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editForm.price}
                  onChange={(event) =>
                    setEditForm((form) =>
                      form ? { ...form, price: event.target.value } : form,
                    )
                  }
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--line)] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                Besin, alerjen ve beyan
              </p>
              <p className="mt-1 mb-3 text-xs text-[var(--muted)]">
                Tarım ve Orman Bakanlığı toplu tüketim yerleri bildirimi.
              </p>
              <NutritionEditor
                caloriesRequired
                value={editForm.nutrition}
                onChange={(nutrition) =>
                  setEditForm((form) => (form ? { ...form, nutrition } : form))
                }
              />
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Ürün seçenekleri</h3>
                  <p className="text-xs text-[var(--muted)]">
                    Boyut, ekstra malzeme veya çıkarılacak içerikleri tanımlayın.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditForm((form) =>
                      form
                        ? {
                            ...form,
                            optionGroups: [
                              ...form.optionGroups,
                              {
                                key: formKey(),
                                name: "",
                                required: false,
                                minSelections: "0",
                                maxSelections: "1",
                                options: [
                                  {
                                    key: formKey(),
                                    name: "",
                                    priceDelta: "0",
                                  },
                                ],
                              },
                            ],
                          }
                        : form,
                    )
                  }
                >
                  Grup ekle
                </Button>
              </div>

              {editForm.optionGroups.map((group, groupIndex) => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-[var(--line)] bg-black/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-40 flex-1">
                      <Label>Grup adı</Label>
                      <Input
                        placeholder="Örn. Boyut"
                        value={group.name}
                        onChange={(event) =>
                          setEditForm((form) =>
                            form
                              ? {
                                  ...form,
                                  optionGroups: form.optionGroups.map(
                                    (current, index) =>
                                      index === groupIndex
                                        ? {
                                            ...current,
                                            name: event.target.value,
                                          }
                                        : current,
                                  ),
                                }
                              : form,
                          )
                        }
                      />
                    </div>
                    <label className="flex h-10 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(event) =>
                          setEditForm((form) =>
                            form
                              ? {
                                  ...form,
                                  optionGroups: form.optionGroups.map(
                                    (current, index) =>
                                      index === groupIndex
                                        ? {
                                            ...current,
                                            required: event.target.checked,
                                            minSelections: event.target.checked
                                              ? String(
                                                  Math.max(
                                                    1,
                                                    Number(
                                                      current.minSelections,
                                                    ) || 0,
                                                  ),
                                                )
                                              : current.minSelections,
                                          }
                                        : current,
                                  ),
                                }
                              : form,
                          )
                        }
                      />
                      Zorunlu
                    </label>
                    <div className="w-20">
                      <Label>Min.</Label>
                      <Input
                        type="number"
                        min="0"
                        value={group.minSelections}
                        onChange={(event) =>
                          setEditForm((form) =>
                            form
                              ? {
                                  ...form,
                                  optionGroups: form.optionGroups.map(
                                    (current, index) =>
                                      index === groupIndex
                                        ? {
                                            ...current,
                                            minSelections: event.target.value,
                                          }
                                        : current,
                                  ),
                                }
                              : form,
                          )
                        }
                      />
                    </div>
                    <div className="w-20">
                      <Label>Maks.</Label>
                      <Input
                        type="number"
                        min="1"
                        value={group.maxSelections}
                        onChange={(event) =>
                          setEditForm((form) =>
                            form
                              ? {
                                  ...form,
                                  optionGroups: form.optionGroups.map(
                                    (current, index) =>
                                      index === groupIndex
                                        ? {
                                            ...current,
                                            maxSelections: event.target.value,
                                          }
                                        : current,
                                  ),
                                }
                              : form,
                          )
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditForm((form) =>
                          form
                            ? {
                                ...form,
                                optionGroups: form.optionGroups.filter(
                                  (_, index) => index !== groupIndex,
                                ),
                              }
                            : form,
                        )
                      }
                    >
                      Grubu sil
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {group.options.map((option, optionIndex) => (
                      <div key={option.key} className="flex items-center gap-2">
                        <Input
                          aria-label="Seçenek adı"
                          placeholder="Örn. Büyük"
                          value={option.name}
                          onChange={(event) =>
                            setEditForm((form) =>
                              form
                                ? {
                                    ...form,
                                    optionGroups: form.optionGroups.map(
                                      (currentGroup, currentGroupIndex) =>
                                        currentGroupIndex === groupIndex
                                          ? {
                                              ...currentGroup,
                                              options:
                                                currentGroup.options.map(
                                                  (
                                                    currentOption,
                                                    currentOptionIndex,
                                                  ) =>
                                                    currentOptionIndex ===
                                                    optionIndex
                                                      ? {
                                                          ...currentOption,
                                                          name: event.target
                                                            .value,
                                                        }
                                                      : currentOption,
                                                ),
                                            }
                                          : currentGroup,
                                    ),
                                  }
                                : form,
                            )
                          }
                        />
                        <Input
                          aria-label="Fiyat farkı"
                          className="w-28"
                          type="number"
                          min="0"
                          step="0.01"
                          value={option.priceDelta}
                          onChange={(event) =>
                            setEditForm((form) =>
                              form
                                ? {
                                    ...form,
                                    optionGroups: form.optionGroups.map(
                                      (currentGroup, currentGroupIndex) =>
                                        currentGroupIndex === groupIndex
                                          ? {
                                              ...currentGroup,
                                              options:
                                                currentGroup.options.map(
                                                  (
                                                    currentOption,
                                                    currentOptionIndex,
                                                  ) =>
                                                    currentOptionIndex ===
                                                    optionIndex
                                                      ? {
                                                          ...currentOption,
                                                          priceDelta:
                                                            event.target.value,
                                                        }
                                                      : currentOption,
                                                ),
                                            }
                                          : currentGroup,
                                    ),
                                  }
                                : form,
                            )
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={group.options.length === 1}
                          onClick={() =>
                            setEditForm((form) =>
                              form
                                ? {
                                    ...form,
                                    optionGroups: form.optionGroups.map(
                                      (current, index) =>
                                        index === groupIndex
                                          ? {
                                              ...current,
                                              options: current.options.filter(
                                                (_, index) =>
                                                  index !== optionIndex,
                                              ),
                                            }
                                          : current,
                                    ),
                                  }
                                : form,
                            )
                          }
                        >
                          Sil
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditForm((form) =>
                          form
                            ? {
                                ...form,
                                optionGroups: form.optionGroups.map(
                                  (current, index) =>
                                    index === groupIndex
                                      ? {
                                          ...current,
                                          options: [
                                            ...current.options,
                                            {
                                              key: formKey(),
                                              name: "",
                                              priceDelta: "0",
                                            },
                                          ],
                                        }
                                      : current,
                                ),
                              }
                            : form,
                        )
                      }
                    >
                      Seçenek ekle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
            <Button className="mt-4" onClick={() => void saveItem()}>
              Değişiklikleri kaydet
            </Button>
          </Card>
        ) : null}

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
                        {item.calories != null ? ` · ${item.calories} kcal` : ""}
                        {item.description ? ` · ${item.description}` : ""}
                      </p>
                      <NutritionLabels item={nutritionFromRow(item)} compact />
                      <Link
                        href="/admin/stock"
                        className={`mt-2 inline-block text-xs font-medium ${
                          item.stockTracked &&
                          item.stockQuantity <= item.lowStockThreshold
                            ? "text-red-700"
                            : "text-[var(--accent)]"
                        }`}
                      >
                        {item.stockTracked
                          ? `Stok: ${item.stockQuantity}${
                              item.stockQuantity <= 0
                                ? " · bitti"
                                : item.stockQuantity <= item.lowStockThreshold
                                  ? " · az kaldı"
                                  : ""
                            }`
                          : "Stok takibi yok · yönet"}
                      </Link>
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
                      variant="secondary"
                      onClick={() => editItem(item)}
                    >
                      Düzenle
                    </Button>
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
            <div className="rounded-2xl border border-[var(--line)] p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                Besin ve alerjen
              </p>
              <NutritionEditor
                caloriesRequired
                value={itemForm.nutrition}
                onChange={(nutrition) =>
                  setItemForm((form) => ({ ...form, nutrition }))
                }
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
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Sonraki teslimat, fire ve sayımlar Stok sayfasından işlenir.
                </p>
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
